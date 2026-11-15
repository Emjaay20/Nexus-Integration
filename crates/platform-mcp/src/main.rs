//! Read-only MCP stdio server, protocol 2025-11-25. No shell or database execution.
use nexus_platform_core::{agent_bridge::AgentBridge, authz::PolicyRule, bom_engine::BomEngine};
use serde_json::{json, Value};
use std::io::{self, BufRead, Read, Write};
const VERSION: &str = "2025-11-25";
const MAX_LINE: usize = 1_048_576;
fn tool_list() -> Value {
    json!([
     {"name":"parse_bom","description":"Parse and validate a local CSV BOM. Does not save data.","inputSchema":{"type":"object","properties":{"raw_content":{"type":"string","maxLength":1000000}},"required":["raw_content"],"additionalProperties":false},"annotations":{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}},
     {"name":"review_query","description":"Advisory review of SQL text. Never executes SQL or establishes access safety.","inputSchema":{"type":"object","properties":{"sql_query":{"type":"string","maxLength":20000}},"required":["sql_query"],"additionalProperties":false},"annotations":{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}},
     {"name":"validate_policy","description":"Inspect a proposed policy for risky configuration. Does not activate or save it.","inputSchema":{"type":"object","properties":{"rule":{"type":"object"}},"required":["rule"],"additionalProperties":false},"annotations":{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}},
     {"name":"diagnose_environment","description":"Report whether required local tools and configuration keys exist. Never returns secret values.","inputSchema":{"type":"object","properties":{},"additionalProperties":false},"annotations":{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}}
    ])
}
fn error(id: Value, code: i32, message: &str) -> Value {
    json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":message}})
}
fn result(id: Value, result: Value) -> Value {
    json!({"jsonrpc":"2.0","id":id,"result":result})
}
fn invoke(name: &str, args: &Value) -> Result<Value, String> {
    let object = args.as_object().ok_or("arguments must be an object")?;
    match name {
        "parse_bom" => {
            if object.len() != 1 {
                return Err("Only raw_content is accepted".into());
            }
            let raw = args["raw_content"]
                .as_str()
                .filter(|v| v.len() <= 1_000_000)
                .ok_or("raw_content must be a string up to 1MB")?;
            Ok(json!(BomEngine::parse_bom_csv(raw)))
        }
        "review_query" => {
            if object.len() != 1 {
                return Err("Only sql_query is accepted".into());
            }
            let sql = args["sql_query"]
                .as_str()
                .filter(|v| v.len() <= 20000)
                .ok_or("sql_query must be a string up to 20KB")?;
            let report = AgentBridge::profile_sql_query(sql);
            Ok(
                json!({"advisory_only":true,"findings":report.detected_anti_patterns,"suggestions":report.optimization_suggestions}),
            )
        }
        "validate_policy" => {
            if object.len() != 1 {
                return Err("Only rule is accepted".into());
            }
            let rule: PolicyRule = serde_json::from_value(args["rule"].clone())
                .map_err(|_| "rule must match the policy contract")?;
            Ok(json!(AgentBridge::validate_policy_rule(&rule)))
        }
        "diagnose_environment" => {
            if !object.is_empty() {
                return Err("No arguments accepted".into());
            }
            let paths = std::env::var_os("PATH").unwrap_or_default();
            let tools: serde_json::Map<String, Value> =
                ["cargo", "go", "node", "docker", "kubectl", "helm"]
                    .into_iter()
                    .map(|name| {
                        (
                            name.into(),
                            json!(std::env::split_paths(&paths).any(|p| p.join(name).is_file())),
                        )
                    })
                    .collect();
            let configuration: serde_json::Map<String, Value> =
                ["DATABASE_URL", "CORE_AUTH_SECRET", "AUTH_SECRET"]
                    .into_iter()
                    .map(|name| (name.into(), json!(std::env::var_os(name).is_some())))
                    .collect();
            Ok(json!({"tools":tools,"configuration_present":configuration,"secrets_redacted":true}))
        }
        _ => Err("Unknown tool".into()),
    }
}
fn dispatch(request: Value, initialized: &mut bool) -> Option<Value> {
    let id = request.get("id").cloned().unwrap_or(Value::Null);
    if request["jsonrpc"] != "2.0"
        || !request.is_object()
        || (!id.is_null() && !id.is_number() && !id.is_string())
    {
        return Some(error(id, -32600, "Invalid request"));
    }
    let method = request["method"].as_str().unwrap_or("");
    request.get("id")?;
    if method == "initialize" {
        *initialized = true;
        return Some(result(
            id,
            json!({"protocolVersion":VERSION,"capabilities":{"tools":{"listChanged":false},"resources":{"subscribe":false,"listChanged":false}},"serverInfo":{"name":"nexus-platform-tools","version":env!("CARGO_PKG_VERSION")},"instructions":"Read-only development tools. SQL reviews are advisory. No tool executes SQL, changes permissions, or accesses production records."}),
        ));
    }
    if !*initialized {
        return Some(error(id, -32002, "Initialize the MCP connection first"));
    }
    Some(match method {
        "ping" => result(id, json!({})),
        "tools/list" => result(id, json!({"tools":tool_list()})),
        "tools/call" => {
            let name = request["params"]["name"].as_str().unwrap_or("");
            let args = request["params"]
                .get("arguments")
                .cloned()
                .unwrap_or(json!({}));
            match invoke(name, &args) {
                Ok(value) => result(
                    id,
                    json!({"content":[{"type":"text","text":value.to_string()}],"structuredContent":value,"isError":false}),
                ),
                Err(message) => result(
                    id,
                    json!({"content":[{"type":"text","text":message}],"isError":true}),
                ),
            }
        }
        "resources/list" => result(
            id,
            json!({"resources":[{"uri":"nexus://platform/contracts","name":"Workspace contracts","mimeType":"application/json","description":"Authentication, role, and job-state contracts"}]}),
        ),
        "resources/read" if request["params"]["uri"] == "nexus://platform/contracts" => result(
            id,
            json!({"contents":[{"uri":"nexus://platform/contracts","mimeType":"application/json","text":json!({"identity":"server-signed subject; role and workspace loaded from PostgreSQL","roles":{"owner":["read","write","manage_members","read_audit"],"design_engineer":["read","write"],"viewer":["read"]},"job_states":["queued","running","retry_wait","completed","failed","cancelled"],"updates_require_revision":true,"job_submission_requires_uuid_idempotency_key":true,"docs":"docs/platform/README.md"}).to_string()}]}),
        ),
        _ => error(id, -32601, "Method not found"),
    })
}
fn main() -> io::Result<()> {
    let mut reader = io::BufReader::new(io::stdin());
    let mut out = io::BufWriter::new(io::stdout());
    let mut initialized = false;
    loop {
        let mut line = Vec::new();
        let size = (&mut reader)
            .take((MAX_LINE + 1) as u64)
            .read_until(b'\n', &mut line)?;
        if size == 0 {
            break;
        }
        let response = if size > MAX_LINE {
            Some(error(Value::Null, -32600, "Message exceeds 1MB"))
        } else {
            match serde_json::from_slice(&line) {
                Ok(request) => dispatch(request, &mut initialized),
                Err(_) => Some(error(Value::Null, -32700, "Parse error")),
            }
        };
        if let Some(response) = response {
            serde_json::to_writer(&mut out, &response)?;
            out.write_all(b"\n")?;
            out.flush()?;
        }
        if size > MAX_LINE {
            break;
        }
    }
    Ok(())
}
