mod file_engine;

use std::process::Command;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, export_project, select_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
