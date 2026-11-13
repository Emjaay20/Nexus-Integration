//! Platform developer CLI (`platform-cli`)
//!
//! Empowers internal engineers and AI agents to test permissions, profile queries,
//! parse BOMs, and interact with the platform engine.

use clap::{Parser, Subcommand};
use serde_json::json;
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "platform-cli")]
#[command(about = "Platform and developer-experience CLI", long_about = None)]
#[command(version = "0.1.0")]
struct Cli {
    #[arg(short, long, default_value = "http://localhost:8080")]
    endpoint: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Ping the platform engine health status
    Health,

    /// Test a permission evaluation against the active policy engine
    TestPerm {
        #[arg(short, long)]
        role: String,

        #[arg(short, long)]
        action: String,

        #[arg(long)]
        resource_type: String,

        #[arg(long, default_value = "globex-oem")]
        subject_tenant: String,

        #[arg(long, default_value = "globex-oem")]
        resource_tenant: String,

        #[arg(long, default_value = "confidential")]
        sensitivity: String,
    },

    /// Profile a SQL query or file for multi-tenancy leaks and anti-patterns
    ProfileSql {
        #[arg(short, long)]
        query: Option<String>,

        #[arg(short, long)]
        file: Option<PathBuf>,
    },

    /// Parse a Bill of Materials (BOM) CSV file and display cost and lifecycle metrics
    ParseBom {
        #[arg(short, long)]
        file: PathBuf,
    },

    /// Look up second-source alternate components
    MatchAlternate {
        #[arg(short, long)]
        mpn: String,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let client = reqwest::Client::new();

    match cli.command {
        Commands::Health => {
            println!("Connecting to Platform Core at {}...", cli.endpoint);
            let res = client
                .get(format!("{}/health", cli.endpoint))
                .send()
                .await?;
            let body: serde_json::Value = res.json().await?;
            println!("{}", serde_json::to_string_pretty(&body)?);
        }

        Commands::TestPerm {
            role,
            action,
            resource_type,
            subject_tenant,
            resource_tenant,
            sensitivity,
        } => {
            let payload = json!({
                "subject": {
                    "user_id": "cli-engineer-test",
                    "tenant_id": subject_tenant,
                    "role": role,
                    "clearance": sensitivity,
                    "attributes": {}
                },
                "action": action,
                "resource": {
                    "resource_id": "test-res-01",
                    "resource_type": resource_type,
                    "tenant_id": resource_tenant,
                    "sensitivity": sensitivity,
                    "attributes": {}
                },
                "context": {
                    "current_time": chrono::Utc::now().to_rfc3339(),
                    "nda_signed": true,
                    "ip_address": "127.0.0.1"
                }
            });

            println!("Sending authorization request to PDP...");
            let res = client
                .post(format!("{}/api/v1/authz/evaluate", cli.endpoint))
                .json(&payload)
                .send()
                .await?;
            let result: serde_json::Value = res.json().await?;
            println!("\n--- Policy Decision Result ---");
            println!("{}", serde_json::to_string_pretty(&result)?);
        }

        Commands::ProfileSql { query, file } => {
            let sql = if let Some(q) = query {
                q
            } else if let Some(f) = file {
                fs::read_to_string(f)?
            } else {
                eprintln!("Error: Please provide --query or --file");
                std::process::exit(1);
            };

            let payload = json!({ "sql_query": sql });
            let res = client
                .post(format!("{}/api/v1/agent/profile-query", cli.endpoint))
                .json(&payload)
                .send()
                .await?;
            let result: serde_json::Value = res.json().await?;
            println!("\n--- SQL Profile Report ---");
            println!("{}", serde_json::to_string_pretty(&result)?);
        }

        Commands::ParseBom { file } => {
            let content = fs::read_to_string(&file)?;
            let payload = json!({ "raw_content": content });
            let res = client
                .post(format!("{}/api/v1/bom/parse", cli.endpoint))
                .json(&payload)
                .send()
                .await?;
            let result: serde_json::Value = res.json().await?;
            println!("\n--- BOM Parsing & PCBA Sourcing Summary ---");
            println!("{}", serde_json::to_string_pretty(&result)?);
        }

        Commands::MatchAlternate { mpn } => {
            let payload = json!({
                "target_mpn": mpn,
                "manufacturer": "Unknown",
                "description": "Electronic Component",
                "max_results": 3
            });
            let res = client
                .post(format!("{}/api/v1/ai/match-alternate", cli.endpoint))
                .json(&payload)
                .send()
                .await?;
            let result: serde_json::Value = res.json().await?;
            println!("\n--- Second-Source Alternates ---");
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
    }

    Ok(())
}
