use std::{env, fs, path::PathBuf};

fn clean_stale_pg_bundle() -> std::io::Result<()> {
    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("out dir must exist"));
    let target_dir = out_dir
        .parent()
        .and_then(|path| path.parent())
        .and_then(|path| path.parent())
        .expect("tauri out dir must live under target/<profile>/build");
    let bundled_pg_dir = target_dir.join("resources").join("pg");

    if bundled_pg_dir.exists() {
        fs::remove_dir_all(bundled_pg_dir)?;
    }

    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    clean_stale_pg_bundle()?;
    tauri_build::build();
    Ok(())
}
