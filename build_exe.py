import os
import sys
import subprocess

def main():
    print("=== ClipQ EXE Builder ===")
    
    # Ensure pyinstaller is installed
    try:
        import PyInstaller
        print("PyInstaller is already installed.")
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    # Run PyInstaller
    print("Building executable...")
    
    # PyInstaller command:
    # --onefile: bundle everything into a single EXE
    # --add-data "app/public;public": embed the public folder in the EXE
    # --name ClipQ: name of the final EXE
    # app/server.py: entry point script
    cmd = [
        "pyinstaller",
        "--onefile",
        "--add-data", "app/public;public",
        "--name", "ClipQ",
        "app/server.py"
    ]
    
    print(f"Running: {' '.join(cmd)}")
    subprocess.check_call(cmd)
    
    print("\n==========================================")
    print("Build successful! The executable is located at:")
    print(os.path.abspath(os.path.join("dist", "ClipQ.exe")))
    print("==========================================")

if __name__ == "__main__":
    main()
