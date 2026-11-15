use super::{Actor, AppError, WorkspaceState};
use actix_web::{dev::Payload, web, FromRequest, HttpRequest};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::{future::Future, pin::Pin};
use uuid::Uuid;

#[derive(Clone)]
pub struct AssertionVerifier(Vec<u8>);
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Claims {
    pub sub: Uuid,
    pub exp: i64,
    pub iat: i64,
    pub aud: String,
}
impl AssertionVerifier {
    pub fn new(secret: &str) -> Result<Self, AppError> {
        if secret.len() < 32 || secret.contains("build-placeholder") {
            return Err(AppError::Unavailable);
        }
        Ok(Self(secret.as_bytes().to_vec()))
    }
    pub fn verify(&self, token: &str, now: i64) -> Result<Uuid, AppError> {
        if token.len() > 2048 {
            return Err(AppError::Unauthorized);
        }
        let (payload, signature) = token.split_once('.').ok_or(AppError::Unauthorized)?;
        let signature = URL_SAFE_NO_PAD
            .decode(signature)
            .map_err(|_| AppError::Unauthorized)?;
        let mut mac =
            Hmac::<Sha256>::new_from_slice(&self.0).map_err(|_| AppError::Unauthorized)?;
        mac.update(payload.as_bytes());
        mac.verify_slice(&signature)
            .map_err(|_| AppError::Unauthorized)?;
        let claims: Claims = serde_json::from_slice(
            &URL_SAFE_NO_PAD
                .decode(payload)
                .map_err(|_| AppError::Unauthorized)?,
        )
        .map_err(|_| AppError::Unauthorized)?;
        if claims.aud != "nexus-workspace"
            || claims.exp <= now
            || claims.iat > now + 5
            || claims.exp - claims.iat > 60
            || claims.iat < now - 65
        {
            return Err(AppError::Unauthorized);
        }
        Ok(claims.sub)
    }
    #[cfg(test)]
    pub fn sign(&self, claims: &Claims) -> String {
        let payload = URL_SAFE_NO_PAD.encode(serde_json::to_vec(claims).unwrap());
        let mut mac = Hmac::<Sha256>::new_from_slice(&self.0).unwrap();
        mac.update(payload.as_bytes());
        format!(
            "{}.{}",
            payload,
            URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
        )
    }
}
impl FromRequest for Actor {
    type Error = AppError;
    type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;
    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let state = req.app_data::<web::Data<WorkspaceState>>().cloned();
        let token = req
            .headers()
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .unwrap_or("")
            .to_string();
        let request_id = req
            .headers()
            .get("x-request-id")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| Uuid::parse_str(v).ok())
            .unwrap_or_else(Uuid::new_v4);
        Box::pin(async move {
            let state = state.ok_or(AppError::Unavailable)?;
            let user_id = state
                .verifier
                .verify(&token, chrono::Utc::now().timestamp())?;
            let actor=sqlx::query_as::<_,Actor>("SELECT m.user_id,m.workspace_id,m.role,$2::uuid AS request_id FROM platform_user_context c JOIN platform_memberships m ON (m.user_id,m.workspace_id)=(c.user_id,c.workspace_id) WHERE c.user_id=$1")
                .bind(user_id).bind(request_id).fetch_optional(&state.pool).await?.ok_or(AppError::Forbidden)?;
            Ok(actor)
        })
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn assertions_reject_tampering_expiry_wrong_audience_and_long_lifetimes() {
        let verifier =
            AssertionVerifier::new("test-secret-with-more-than-thirty-two-bytes").unwrap();
        let mut claims = Claims {
            sub: Uuid::new_v4(),
            iat: 1000,
            exp: 1030,
            aud: "nexus-workspace".into(),
        };
        assert!(verifier.verify(&verifier.sign(&claims), 1010).is_ok());
        assert!(verifier.verify(&verifier.sign(&claims), 1030).is_err());
        let token = verifier.sign(&claims);
        assert!(verifier.verify(&(token + "x"), 1010).is_err());
        claims.aud = "another-service".into();
        assert!(verifier.verify(&verifier.sign(&claims), 1010).is_err());
        claims.aud = "nexus-workspace".into();
        claims.exp = 2000;
        assert!(verifier.verify(&verifier.sign(&claims), 1010).is_err());
    }
}
