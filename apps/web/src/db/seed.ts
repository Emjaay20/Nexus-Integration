// The Rust workspace provisions its own isolated demo BOM. No synthetic integrations,
// activity or API keys are inserted for normal accounts (or on repeated sign-in).
export async function seedUserData(_userId:string):Promise<void>{}
// Retain the exported interface for legacy callers; never erase records implicitly.
export async function clearUserData(_userId:string):Promise<void>{throw new Error('Legacy data deletion is disabled');}
