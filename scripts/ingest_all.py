import subprocess
import os

def run_cmd(args):
    print(f"Running: {' '.join(args)}")
    res = subprocess.run(args, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"FAILED: {res.stderr}")
    else:
        print(res.stdout)

def main():
    # 1. Seed base passages
    run_cmd(["python3", "scripts/ingest.py", "--seed"])
    
    # 2. Ingest custom files
    files_to_ingest = [
        ("corpus/aquinas.txt", "aquinas", "Summa Theologiae"),
        ("corpus/benedict.txt", "benedict", "Rule of Saint Benedict"),
        ("corpus/liguori.txt", "liguori", "Moral Theology"),
        ("corpus/montfort.txt", "montfort", "True Devotion to Mary"),
        ("corpus/more.txt", "more", "Dialogue of Comfort Against Tribulation"),
        ("corpus/teresa.txt", "teresa", "The Interior Castle")
    ]
    
    for filepath, doctor, work in files_to_ingest:
        if os.path.exists(filepath):
            run_cmd(["python3", "scripts/ingest.py", filepath, doctor, work])
        else:
            print(f"File not found: {filepath}")

if __name__ == "__main__":
    main()
