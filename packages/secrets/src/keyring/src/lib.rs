use napi::bindgen_prelude::{AsyncTask, FromNapiValue, ToNapiValue};
use napi_derive::napi;
use workers::{DeletePassword, FindCredentials, FindPassword, GetPassword, SetPassword, SetPasswordWithPersistence};

extern crate secrets_core;

mod workers;

#[napi]
pub enum PersistenceLevel {
    Session,
    LocalMachine,
    Enterprise,
}

impl From<PersistenceLevel> for secrets_core::os::CredentialPersistence {
    fn from(level: PersistenceLevel) -> Self {
        match level {
            PersistenceLevel::Session => secrets_core::os::CredentialPersistence::Session,
            PersistenceLevel::LocalMachine => secrets_core::os::CredentialPersistence::LocalMachine,
            PersistenceLevel::Enterprise => secrets_core::os::CredentialPersistence::Enterprise,
        }
    }
}

#[napi]
fn delete_password(service: String, account: String) -> AsyncTask<DeletePassword> {
    AsyncTask::new(DeletePassword { service, account })
}

#[napi]
fn find_credentials(service: String) -> AsyncTask<FindCredentials> {
    AsyncTask::new(FindCredentials { service })
}

#[napi(ts_return_type = "Promise<string | null>")]
fn find_password(service: String) -> AsyncTask<FindPassword> {
    AsyncTask::new(FindPassword { service })
}

#[napi(ts_return_type = "Promise<string | null>")]
fn get_password(service: String, account: String) -> AsyncTask<GetPassword> {
    AsyncTask::new(GetPassword { service, account })
}

#[napi(ts_return_type = "Promise<void>")]
fn set_password(service: String, account: String, password: String) -> AsyncTask<SetPassword> {
    AsyncTask::new(SetPassword {
        service,
        account,
        password,
    })
}

#[napi(ts_return_type = "Promise<void>")]
fn set_password_with_persistence(
    service: String, 
    account: String, 
    password: String, 
    persistence: PersistenceLevel
) -> AsyncTask<SetPasswordWithPersistence> {
    AsyncTask::new(SetPasswordWithPersistence {
        service,
        account,
        password,
        persistence: persistence.into(),
    })
}