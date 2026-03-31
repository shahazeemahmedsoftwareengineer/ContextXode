// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file_engine;

use std::process::Command;
use tauri_plugin_dialog::init as dialog_plugin;

#[tauri::command]
fn export_project(path: String) -> (String, String) {
    file_engine::process_project(&path)
}

#[tauri::command]
fn select_folder() -> Option<String> {
    if cfg!(target_os = "windows") {
        let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.RootFolder = 'MyComputer'
$dialog.Description = 'Select a project folder'
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath }
"#;

        let output = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(script)
            .output()
            .ok()?;

        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            None
        } else {
            Some(path)
        }
    } else {
        None
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(dialog_plugin())
        .invoke_handler(tauri::generate_handler![export_project, select_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
