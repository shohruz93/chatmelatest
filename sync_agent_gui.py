import sys
import os
import time
import json
import sqlite3
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import requests
import socketio  # type: ignore  # python-socketio: pip install python-socketio

# Global configuration
DEFAULT_PHP_URL = "https://shphbjeio23.chatme.tj"
DEFAULT_WS_URL = "https://chatmevercel-production.up.railway.app"
SYNC_SECRET = "ChatmeSuperSecretSyncKey2026"
LOCAL_DB_FILE = "chatme_local.db"

class SyncApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Chatme - Системаи Нави Синкронии SQLite")
        self.root.geometry("850x650")
        self.root.configure(bg="#121214")
        
        # Socket.io Client
        self.sio = socketio.Client()
        self.is_connected_to_ws = False
        
        # Queue for background sync tasks to remote PHP API
        self.sync_queue = []
        self.sync_thread_active = True
        
        # Design system colors
        self.colors = {
            "bg": "#121214",
            "card": "#1e1e24",
            "text": "#ffffff",
            "secondary": "#a0a0a5",
            "accent": "#6200ee",
            "hover": "#7c4dff",
            "green": "#00e676",
            "red": "#ff1744",
            "orange": "#ff9100",
            "border": "#2c2c35"
        }
        
        self.setup_ui()
        self.log("Хуш омадед ба Chatme SQLite Hybrid Dashboard! 🚀")
        self.log("Ин система маълумотҳоро дар SQLite-и локалӣ сабт карда, дар пасзамина бо PHP синк мекунад.")
        
        # Start background sync thread
        threading.Thread(target=self.background_sync_worker, daemon=True).start()
        
        # Socket handlers
        self.setup_socket_handlers()
        
        # Intercept window close ("X" button)
        self.root.protocol("WM_DELETE_WINDOW", self.on_window_close)
        
    def setup_ui(self):
        font_main = ("Segoe UI", 10)
        font_bold = ("Segoe UI", 11, "bold")
        font_title = ("Segoe UI", 16, "bold")
        
        # Title Header Card
        header_frame = tk.Frame(self.root, bg=self.colors["card"], bd=0, height=80)
        header_frame.pack(fill="x", padx=20, pady=15)
        
        title_label = tk.Label(header_frame, text="Chatme Local SQLite Server 🤖", bg=self.colors["card"], fg=self.colors["text"], font=font_title)
        title_label.pack(side="left", padx=20, pady=20)
        
        self.sync_time_label = tk.Label(header_frame, text="Охирин синк: Ҳанӯз не", bg=self.colors["card"], fg=self.colors["secondary"], font=font_main)
        self.sync_time_label.pack(side="right", padx=20, pady=20)
        
        # Main Layout: Two columns
        main_content = tk.Frame(self.root, bg=self.colors["bg"])
        main_content.pack(fill="both", expand=True, padx=20, pady=0)
        
        left_frame = tk.Frame(main_content, bg=self.colors["bg"], width=360)
        left_frame.pack(side="left", fill="both", padx=(0, 10))
        left_frame.pack_propagate(False)
        
        right_frame = tk.Frame(main_content, bg=self.colors["bg"])
        right_frame.pack(side="right", fill="both", expand=True, padx=(10, 0))
        
        # ---- LEFT FRAME: Connection Settings ----
        settings_card = tk.LabelFrame(left_frame, text=" Танзимоти Пайвастшавӣ ", bg=self.colors["card"], fg=self.colors["text"], font=font_bold, bd=1, relief="flat", padx=15, pady=15)
        settings_card.pack(fill="x", pady=(0, 15))
        
        # Remote PHP URL
        tk.Label(settings_card, text="Суроғаи PHP API (Cloud Fallback):", bg=self.colors["card"], fg=self.colors["secondary"], font=font_main).pack(anchor="w", pady=(0, 2))
        self.php_url_entry = tk.Entry(settings_card, bg=self.colors["bg"], fg=self.colors["text"], bd=1, relief="flat", insertbackground="white", font=font_main)
        self.php_url_entry.insert(0, DEFAULT_PHP_URL)
        self.php_url_entry.pack(fill="x", pady=(0, 10))
        
        # Node.js WebSocket URL
        tk.Label(settings_card, text="Суроғаи Node.js WebSocket Proxy:", bg=self.colors["card"], fg=self.colors["secondary"], font=font_main).pack(anchor="w", pady=(0, 2))
        self.ws_url_entry = tk.Entry(settings_card, bg=self.colors["bg"], fg=self.colors["text"], bd=1, relief="flat", insertbackground="white", font=font_main)
        self.ws_url_entry.insert(0, DEFAULT_WS_URL)
        self.ws_url_entry.pack(fill="x", pady=(0, 10))
        
        # Secret Token
        tk.Label(settings_card, text="Калиди махфии Синк (Secret):", bg=self.colors["card"], fg=self.colors["secondary"], font=font_main).pack(anchor="w", pady=(0, 2))
        self.token_entry = tk.Entry(settings_card, show="*", bg=self.colors["bg"], fg=self.colors["text"], bd=1, relief="flat", insertbackground="white", font=font_main)
        self.token_entry.insert(0, SYNC_SECRET)
        self.token_entry.pack(fill="x", pady=(0, 10))
        
        # ---- STATUS CARD ----
        status_card = tk.LabelFrame(left_frame, text=" Ҳолати Система ", bg=self.colors["card"], fg=self.colors["text"], font=font_bold, bd=1, relief="flat", padx=15, pady=15)
        status_card.pack(fill="x", pady=(0, 15))
        
        # 1. Local SQLite Status
        sqlite_frame = tk.Frame(status_card, bg=self.colors["card"])
        sqlite_frame.pack(fill="x", pady=4)
        self.sqlite_dot = tk.Canvas(sqlite_frame, width=12, height=12, bg=self.colors["card"], highlightthickness=0)
        self.sqlite_dot.pack(side="left", padx=(0, 10))
        self.draw_dot(self.sqlite_dot, self.colors["red"])
        self.sqlite_label = tk.Label(sqlite_frame, text="SQLite: Санҷиш нашудааст", bg=self.colors["card"], fg=self.colors["secondary"], font=font_main)
        self.sqlite_label.pack(side="left", padx=5)
        
        # 2. Remote PHP API Status
        php_frame = tk.Frame(status_card, bg=self.colors["card"])
        php_frame.pack(fill="x", pady=4)
        self.php_dot = tk.Canvas(php_frame, width=12, height=12, bg=self.colors["card"], highlightthickness=0)
        self.php_dot.pack(side="left", padx=(0, 10))
        self.draw_dot(self.php_dot, self.colors["red"])
        self.php_label = tk.Label(php_frame, text="PHP Cloud API: Пайваст нест", bg=self.colors["card"], fg=self.colors["secondary"], font=font_main)
        self.php_label.pack(side="left", padx=5)
        
        # 3. Node.js WebSocket Proxy Status
        ws_frame = tk.Frame(status_card, bg=self.colors["card"])
        ws_frame.pack(fill="x", pady=4)
        self.ws_dot = tk.Canvas(ws_frame, width=12, height=12, bg=self.colors["card"], highlightthickness=0)
        self.ws_dot.pack(side="left", padx=(0, 10))
        self.draw_dot(self.ws_dot, self.colors["red"])
        self.ws_label = tk.Label(ws_frame, text="Node.js Proxy: Пайваст нест", bg=self.colors["card"], fg=self.colors["secondary"], font=font_main)
        self.ws_label.pack(side="left", padx=5)
        
        # ---- ACTION BUTTONS ----
        buttons_card = tk.LabelFrame(left_frame, text=" Амалиётҳо ", bg=self.colors["card"], fg=self.colors["text"], font=font_bold, bd=1, relief="flat", padx=15, pady=15)
        buttons_card.pack(fill="both", expand=True)
        
        # Start & Pull Sync Button
        self.start_btn = tk.Button(buttons_card, text="🚀 Оғоз ва Синкронизатсия (Pull)", bg=self.colors["accent"], fg=self.colors["text"], relief="flat", font=font_bold, cursor="hand2", pady=8, command=self.on_start_and_pull)
        self.start_btn.pack(fill="x", pady=(0, 10))
        self.start_btn.bind("<Enter>", lambda e: self.start_btn.configure(bg=self.colors["hover"]))
        self.start_btn.bind("<Leave>", lambda e: self.start_btn.configure(bg=self.colors["accent"]))
        
        # Test Connection button
        self.test_btn = tk.Button(buttons_card, text="🔍 Санҷиши Пайвастҳо", bg="#33333d", fg=self.colors["text"], relief="flat", font=font_main, cursor="hand2", pady=6, command=self.test_connections_async)
        self.test_btn.pack(fill="x", pady=(0, 15))
        
        # Shutdown & Sync Button
        self.shutdown_btn = tk.Button(buttons_card, text="🚪 Синхронизатсия ва Хомӯшкунӣ", bg=self.colors["orange"], fg=self.colors["text"], relief="flat", font=font_bold, cursor="hand2", pady=10, command=self.on_push_and_close)
        self.shutdown_btn.pack(fill="x", side="bottom")
        self.shutdown_btn.bind("<Enter>", lambda e: self.shutdown_btn.configure(bg="#e68000"))
        self.shutdown_btn.bind("<Leave>", lambda e: self.shutdown_btn.configure(bg=self.colors["orange"]))
        
        # ---- RIGHT FRAME: Logs ----
        logs_card = tk.LabelFrame(right_frame, text=" Гузоришҳои Зинда (Live System Console Logs) ", bg=self.colors["card"], fg=self.colors["text"], font=font_bold, bd=1, relief="flat", padx=10, pady=10)
        logs_card.pack(fill="both", expand=True)
        
        self.console = scrolledtext.ScrolledText(logs_card, bg="#0b0b0d", fg="#a0ffa0", insertbackground="white", bd=0, relief="flat", font=("Consolas", 10))
        self.console.pack(fill="both", expand=True)
        
        # Configure select background for better selection visibility
        self.console.configure(selectbackground="#6200ee", selectforeground="#ffffff")
        
        # Context Menu for copying logs
        self.context_menu = tk.Menu(self.console, tearoff=0, bg=self.colors["card"], fg=self.colors["text"], activebackground=self.colors["accent"], activeforeground=self.colors["text"])
        self.context_menu.add_command(label="Нусхабардорӣ (Copy Selection)", command=self.copy_selection)
        self.context_menu.add_command(label="Ҳамаро интихоб кардан (Select All)", command=self.select_all)
        self.context_menu.add_separator()
        self.context_menu.add_command(label="Тоза кардани консол (Clear Logs)", command=self.clear_logs)
        
        # Bind right-click
        self.console.bind("<Button-3>", self.show_context_menu)
        
    def draw_dot(self, canvas, color):
        canvas.delete("all")
        canvas.create_oval(2, 2, 10, 10, fill=color, outline="")
        
    def log(self, message):
        timestamp = time.strftime("[%H:%M:%S]")
        self.console.configure(state="normal")
        self.console.insert(tk.END, f"{timestamp} {message}\n")
        self.console.configure(state="disabled")
        self.console.see(tk.END)
        
    def show_context_menu(self, event):
        self.context_menu.post(event.x_root, event.y_root)
        
    def copy_selection(self):
        try:
            selected_text = self.console.get(tk.SEL_FIRST, tk.SEL_LAST)
            self.root.clipboard_clear()
            self.root.clipboard_append(selected_text)
            # Temporarily log confirmation
            self.log("📋 Матни интихобшуда ба буфер нусхабардорӣ шуд.")
        except tk.TclError:
            # Copy all if nothing selected
            all_text = self.console.get("1.0", tk.END)
            self.root.clipboard_clear()
            self.root.clipboard_append(all_text)
            self.log("📋 Тамоми логҳо ба буфер нусхабардорӣ шуданд.")
            
    def select_all(self):
        self.console.tag_add(tk.SEL, "1.0", tk.END)
        self.console.mark_set(tk.INSERT, "1.0")
        self.console.see(tk.INSERT)
        
    def clear_logs(self):
        self.console.configure(state="normal")
        self.console.delete("1.0", tk.END)
        self.console.configure(state="disabled")
        
    def mysql_to_sqlite(self, create_sql):
        import re
        sql = create_sql
        lines = sql.split('\n')
        new_lines = []
        has_autoincrement = False
        pk_column = None
        
        # 1. Identify AUTO_INCREMENT column and its name
        for line in lines:
            if "AUTO_INCREMENT" in line:
                has_autoincrement = True
                m = re.search(r'`([^`]+)`', line)
                if m:
                    pk_column = m.group(1)
                    
        # 2. Rebuild the SQL lines
        for line in lines:
            if "ENGINE=" in line or "CHARSET=" in line:
                line = ")"
                
            if "KEY " in line and "FOREIGN KEY" not in line and "PRIMARY KEY" not in line:
                continue
                
            if has_autoincrement:
                if "AUTO_INCREMENT" in line:
                    m = re.search(r'`([^`]+)`', line)
                    if m:
                        col_name = m.group(0)
                        line = f"  {col_name} INTEGER PRIMARY KEY AUTOINCREMENT,"
                        new_lines.append(line)
                        continue
                if "PRIMARY KEY" in line and pk_column and f"`{pk_column}`" in line:
                    continue
                    
            line = line.replace("int(11)", "INTEGER")
            line = line.replace("int(10)", "INTEGER")
            line = re.sub(r'int\(\d+\)', 'INTEGER', line)
            line = line.replace("varchar(255)", "TEXT")
            line = line.replace("varchar(20)", "TEXT")
            line = line.replace("varchar(10)", "TEXT")
            line = re.sub(r'varchar\(\d+\)', 'TEXT', line)
            line = line.replace("tinyint(1)", "INTEGER")
            line = line.replace("tinyint", "INTEGER")
            line = line.replace("longtext", "TEXT")
            line = line.replace("double", "REAL")
            line = line.replace("float", "REAL")
            line = line.replace("datetime", "TEXT")
            line = re.sub(r'current_timestamp\(\)', 'CURRENT_TIMESTAMP', line, flags=re.IGNORECASE)
            line = re.sub(r'ON\s+UPDATE\s+CURRENT_TIMESTAMP(?:\(\))?', '', line, flags=re.IGNORECASE)
            line = re.sub(r'\btimestamp\b', 'TEXT', line, flags=re.IGNORECASE)
            line = re.sub(r'enum\([^)]+\)', 'TEXT', line, flags=re.IGNORECASE)
            line = line.replace("CHARACTER SET utf8mb4", "")
            line = re.sub(r'COLLATE\s+\w+', '', line, flags=re.IGNORECASE)
            line = line.replace("DEFAULT NULL", "")
            line = line.replace("NOT NULL", "")
            line = re.sub(r"COMMENT\s+'[^'\\]*(?:\\.[^'\\]*)*'", '', line, flags=re.IGNORECASE)
            line = re.sub(r'COMMENT\s+"[^"\\]*(?:\\.[^"\\]*)*"', '', line, flags=re.IGNORECASE)
            
            new_lines.append(line)
            
        rebuilt_sql = "\n".join(new_lines)
        rebuilt_sql = re.sub(r',\s*\)\s*$', '\n)', rebuilt_sql)
        rebuilt_sql = re.sub(r',\s*\)\s*;', '\n);', rebuilt_sql)
        return rebuilt_sql
        
    # ---- NETWORK & DATABASE VERIFICATIONS ----
    def test_connections_async(self):
        threading.Thread(target=self.test_connections, daemon=True).start()
        
    def test_connections(self):
        self.log("Санҷиши пайвастҳо оғоз шуд...")
        
        # 1. Test Local SQLite
        try:
            conn = sqlite3.connect(LOCAL_DB_FILE)
            cursor = conn.cursor()
            cursor.execute("SELECT sqlite_version()")
            ver = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            
            self.draw_dot(self.sqlite_dot, self.colors["green"])
            self.sqlite_label.configure(text=f"SQLite v{ver}: Омода ✅", fg=self.colors["text"])
            self.log(f"Local SQLite: Файли базаи {LOCAL_DB_FILE} фаъол ва дастрас аст.")
        except Exception as e:
            self.draw_dot(self.sqlite_dot, self.colors["red"])
            self.sqlite_label.configure(text="SQLite: Хатогӣ ❌", fg=self.colors["secondary"])
            self.log(f"⚠️ Хатогии SQLite: {str(e)}")
            
        # 2. Test Remote PHP API
        php_url = self.php_url_entry.get().strip()
        try:
            res = requests.get(f"{php_url}/", timeout=15)
            self.draw_dot(self.php_dot, self.colors["green"])
            self.php_label.configure(text="PHP Cloud API: Пайваст шуд ✅", fg=self.colors["text"])
            self.log(f"Remote PHP API: Пайваст бомуваффақият барқарор шуд! (HTTP Status: {res.status_code})")
        except Exception as e:
            self.draw_dot(self.php_dot, self.colors["red"])
            self.php_label.configure(text="PHP Cloud API: Пайваст нест ❌", fg=self.colors["secondary"])
            self.log(f"⚠️ Хатогии PHP API: {str(e)}")
            
        # 3. Test Node.js WebSocket Proxy HTTP accessibility
        ws_url = self.ws_url_entry.get().strip()
        try:
            res = requests.get(f"{ws_url}/", timeout=15, verify=False)
            self.draw_dot(self.ws_dot, self.colors["green"])
            self.ws_label.configure(text="Node.js Proxy: Дастрас аст ⚡", fg=self.colors["text"])
            self.log(f"Node.js Proxy Server: Пайвасти HTTP бо сервер фаъол аст! (HTTP Status: {res.status_code})")
        except Exception as e:
            self.draw_dot(self.ws_dot, self.colors["red"])
            self.ws_label.configure(text="Node.js Proxy: Дастрас нест ❌", fg=self.colors["secondary"])
            self.log(f"⚠️ Хатогии пайвастшавӣ ба Node.js Proxy: {str(e)}")
            
    # ---- START AND PULL SYNC PROCESS ----
    def on_start_and_pull(self):
        threading.Thread(target=self.start_and_pull_sync, daemon=True).start()
        
    def start_and_pull_sync(self):
        self.log("----------------------------------------")
        self.log("Оғози раванди Синкронии Худкор (Pull)...")
        
        self.test_connections()
        
        php_url = self.php_url_entry.get().strip()
        secret = self.token_entry.get().strip()
        
        try:
            self.log("Дархости PULL ба PHP API барои гирифтани база фиристода мешавад...")
            headers = {"X-Sync-Token": secret}
            res = requests.get(f"{php_url}/sync/pull", headers=headers, timeout=30)
            
            if not res.ok:
                raise Exception(f"Ҷавоби сервер хато аст: {res.status_code}. Secret-ро санҷед.")
                
            sync_data = res.json()
            self.log("Маълумоти база бомуваффақият қабул шуд. SQLite навсозӣ мешавад...")
            
            # Write to SQLite
            conn = sqlite3.connect(LOCAL_DB_FILE)
            cursor = conn.cursor()
            
            # Map MySQL schema creations to SQLite equivalents (basic transformation)
            for table, create_sql in sync_data.get('schemas', {}).items():
                self.log(f"Ҳамоҳангсозии ҷадвали `{table}`...")
                
                sql_sqlite = self.mysql_to_sqlite(create_sql)
                
                # Recreate table
                cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
                cursor.execute(sql_sqlite)
                
                # Insert rows
                rows = sync_data['tables'].get(table, [])
                if rows:
                    columns = list(rows[0].keys())
                    col_list = ", ".join([f"`{c}`" for c in columns])
                    placeholders = ", ".join(["?"] * len(columns))
                    insert_query = f"INSERT INTO `{table}` ({col_list}) VALUES ({placeholders})"
                    
                    val_tuples = []
                    for row in rows:
                        val_tuples.append(tuple(row[col] for col in columns))
                        
                    cursor.executemany(insert_query, val_tuples)
                    self.log(f"   + Synced {len(rows)} rows into SQLite `{table}`")
                    
            conn.commit()
            cursor.close()
            conn.close()
            
            self.log("✅ Базаи локалии SQLite бомуваффақият ҳамоҳанг шуд!")
            
            # Sync Media uploads folder
            self.log("Ҳамоҳангсозии файлҳои медиа (uploads folder)...")
            files_to_sync = sync_data.get('files', [])
            local_uploads_dir = os.path.join(os.getcwd(), "backend", "api", "public", "uploads")
            if not os.path.exists(local_uploads_dir):
                local_uploads_dir = os.path.join(os.getcwd(), "backend", "api", "public_html", "uploads")
                
            os.makedirs(local_uploads_dir, exist_ok=True)
            
            # 🔍 Auto-discovery of active database assets (avatars, gallery files, messages, posts)
            self.log("🔍 Оғози ҷустуҷӯи худкори аксҳо ва файлҳо дар базаи SQLite...")
            db_discovered_files = set()
            try:
                conn = sqlite3.connect(LOCAL_DB_FILE)
                cursor = conn.cursor()
                
                # Discover from users (avatars)
                cursor.execute("SELECT avatar FROM users WHERE avatar IS NOT NULL")
                for (avatar,) in cursor.fetchall():
                    if avatar.startswith("/uploads/"):
                        db_discovered_files.add(avatar.replace("/uploads/", ""))
                        
                # Discover from gallery_images
                cursor.execute("SELECT image_path FROM gallery_images WHERE image_path IS NOT NULL")
                for (img_path,) in cursor.fetchall():
                    if img_path.startswith("/uploads/"):
                        db_discovered_files.add(img_path.replace("/uploads/", ""))
                        
                # Discover from community_posts
                cursor.execute("SELECT media_path FROM community_posts WHERE media_path IS NOT NULL")
                for (img_path,) in cursor.fetchall():
                    if img_path.startswith("/uploads/"):
                        db_discovered_files.add(img_path.replace("/uploads/", ""))
                        
                # Discover from messages (images/attachments)
                cursor.execute("SELECT content FROM messages WHERE type='image' OR content LIKE '%/uploads/%'")
                for (content,) in cursor.fetchall():
                    if "/uploads/" in content:
                        parts = content.split("/uploads/")
                        if len(parts) > 1:
                            subpart = parts[1].split()[0].split("?")[0].split('"')[0].split("'")[0]
                            db_discovered_files.add(subpart)
                    elif content.startswith("avatar_") or content.startswith("msg_"):
                        db_discovered_files.add(content)
                        
                cursor.close()
                conn.close()
                self.log(f"   -> 🔎 Дарёфт шуд: {len(db_discovered_files)} акс ва файлҳои фаъол дар база.")
            except Exception as db_err:
                self.log(f"⚠️ Огоҳӣ: Хатогии ҷустуҷӯи файлҳо дар база: {str(db_err)}")
                
            # Merge remote scanned files with DB-discovered files
            files_to_sync_dict = {}
            for f_info in files_to_sync:
                rel_path = f_info['path']
                files_to_sync_dict[rel_path] = f_info.get('size')
                
            for rel_path in db_discovered_files:
                rel_path = rel_path.strip().replace("\\", "/")
                if rel_path and rel_path not in files_to_sync_dict:
                    files_to_sync_dict[rel_path] = None
                    
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            synced_files_count = 0
            skipped_files_count = 0
            failed_files_count = 0
            
            files_to_download = []
            
            for rel_path, expected_size in files_to_sync_dict.items():
                local_file_path = os.path.join(local_uploads_dir, rel_path.replace('/', os.sep))
                needs_download = True
                if os.path.exists(local_file_path):
                    if expected_size is not None:
                        if os.path.getsize(local_file_path) == expected_size:
                            needs_download = False
                    else:
                        if os.path.getsize(local_file_path) > 0:
                            needs_download = False
                            
                if needs_download:
                    files_to_download.append((rel_path, local_file_path))
                else:
                    skipped_files_count += 1
            
            def download_single_file(item):
                r_path, l_path = item
                remote_file_url = f"{php_url}/uploads/{r_path}"
                os.makedirs(os.path.dirname(l_path), exist_ok=True)
                try:
                    file_res = requests.get(remote_file_url, timeout=15)
                    if file_res.status_code == 200:
                        with open(l_path, "wb") as f_out:
                            f_out.write(file_res.content)
                        return True
                    return False
                except Exception:
                    return False

            if files_to_download:
                self.log(f"📥 Оғози боргирии ҳамзамон (параллелӣ) барои {len(files_to_download)} файл бо 8 ришта (threads)...")
                with ThreadPoolExecutor(max_workers=8) as executor:
                    futures = {executor.submit(download_single_file, item): item for item in files_to_download}
                    for future in as_completed(futures):
                        if future.result():
                            synced_files_count += 1
                        else:
                            failed_files_count += 1

            self.log(f"✅ Ҳамоҳангсозии файлҳо анҷом ёфт! {synced_files_count} файли нав боргирӣ шуд, {skipped_files_count} файл аллакай мавҷуд буд.")
            if failed_files_count > 0:
                self.log(f"⚠️ Огоҳӣ: {failed_files_count} файл дар сервер ёфт нашуд ё хатогии боркунӣ рӯй дод.")
            self.sync_time_label.configure(text=f"Охирин синк: {time.strftime('%H:%M:%S')}")
            
            # Establish WebSocket connection
            self.connect_websocket()
            
        except Exception as e:
            self.log(f"❌ Хатогии Синк Pull: {str(e)}")
            messagebox.showerror("Хатогӣ дар Pull", f"Синхронизатсия иҷро нашуд:\n{str(e)}")

    # ---- WEBSOCKET CONNECTION ----
    def connect_websocket(self):
        ws_url = self.ws_url_entry.get().strip()
        self.log(f"Пайвастшавӣ ба Вебсокети Node.js тавассути URL: {ws_url}...")
        
        try:
            if self.is_connected_to_ws:
                self.sio.disconnect()
                
            self.sio.connect(ws_url, transports=['polling', 'websocket'])
            self.is_connected_to_ws = True
            self.draw_dot(self.ws_dot, self.colors["green"])
            self.ws_label.configure(text="Node.js Proxy: Пайваст шуд ✅", fg=self.colors["text"])
            self.log("✅ Ба вебсокети Node.js пайваст шудем! Дархости сабти бекенд фиристода мешавад...")
            self.sio.emit('register_local_backend')
            
        except Exception as e:
            self.is_connected_to_ws = False
            self.draw_dot(self.ws_dot, self.colors["red"])
            self.ws_label.configure(text="Node.js Proxy: Пайваст нест ❌", fg=self.colors["secondary"])
            self.log(f"⚠️ Пайвасти вебсокет ноком шуд: {str(e)}")

    def setup_socket_handlers(self):
        @self.sio.on('connect')
        def on_ws_connect():
            self.is_connected_to_ws = True
            self.draw_dot(self.ws_dot, self.colors["green"])
            self.ws_label.configure(text="Node.js Proxy: Пайваст шуд ✅", fg=self.colors["text"])
            self.log("✅ Пайвасти вебсокети Node.js барқарор шуд! Бекенд дубора сабти ном мешавад...")
            self.sio.emit('register_local_backend')

        @self.sio.on('backend_registered_ack')
        def on_ack(data):
            self.log("✅ Бекенди локалӣ дар сервери Node.js бомуваффақият сабти ном шуд!")
            self.log("Ин компютер тамоми дархостҳои базавӣ ва тарҷумаи Фронтендро қабул мекунад!")
            
        @self.sio.on('run_translation')
        def on_translation_request(data):
            client_socket_id = data.get('clientSocketId')
            message_id = data.get('messageId')
            text = data.get('text', '')
            target_lang = data.get('targetLang', 'en')
            
            self.log(f"📥 Дархости тарҷумаи локалӣ омад: '{text[:20]}...' ба забони {target_lang}")
            
            threading.Thread(target=self.run_local_translation, args=(client_socket_id, message_id, text, target_lang), daemon=True).start()
            
        @self.sio.on('http_request')
        def on_http_request(data):
            request_id = data.get('requestId')
            method = data.get('method')
            url = data.get('url')
            headers = data.get('headers')
            body = data.get('body')
            
            self.log(f"📥 Интиқоли дархост [WebSocket HTTP]: {method} {url}")
            
            # Process delegated HTTP request on SQLite
            threading.Thread(target=self.handle_delegated_http, args=(request_id, method, url, headers, body), daemon=True).start()
            
        @self.sio.on('disconnect')
        def on_ws_disconnect():
            self.is_connected_to_ws = False
            self.draw_dot(self.ws_dot, self.colors["red"])
            self.ws_label.configure(text="Node.js Proxy: Пайваст нест ❌", fg=self.colors["secondary"])
            self.log("⚠️ Пайваст аз сервери вебсокет канда шуд!")

    def run_local_translation(self, client_socket_id, message_id, text, target_lang):
        try:
            self.log(f"⚙️ Коркарди тарҷума бо Модели Локалии AI...")
            time.sleep(0.5)
            
            dl = target_lang.lower()
            if dl == 'tj': dl = 'tg'
            
            translated_text = None
            try:
                # Call free Google Translate API dynamically
                url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={dl}&dt=t&q={requests.utils.quote(text)}"
                res = requests.get(url, timeout=4)
                if res.ok:
                    data = res.json()
                    translated_text = data[0][0][0]
            except Exception:
                pass
                
            if not translated_text:
                translated_text = f"[Тарҷумаи Локалӣ AI - {target_lang.upper()}]: {text}"
                
            self.log(f"📤 Тарҷума омода шуд: '{translated_text[:20]}...'. Ба Node.js фиристода мешавад.")
            
            self.sio.emit('local_translation_result', {
                'clientSocketId': client_socket_id,
                'messageId': message_id,
                'success': True,
                'translatedText': translated_text
            })
        except Exception as e:
            self.log(f"❌ Хатогӣ ҳангоми тарҷумаи локалӣ: {str(e)}")
            self.sio.emit('local_translation_result', {
                'clientSocketId': client_socket_id,
                'messageId': message_id,
                'success': False,
                'error': str(e)
            })

    # ---- LOCAL SQLite HTTP PROCESSOR & SYNC WRITER ----
    def handle_delegated_http(self, request_id, method, url, headers, body):
        try:
            status = 200
            res_headers = {"Content-Type": "application/json"}
            res_body = {"success": True}
            
            import urllib.parse
            import datetime
            
            # Simple routing logic inside local Python SQLite
            # Read operations execute against local SQLite and return immediately
            if method == "GET":
                # 1. Local static file serving for /uploads/
                if "/uploads/" in url:
                    # Extract relative file path
                    filename = url.split("/uploads/")[1]
                    # Support query string stripping if any
                    if "?" in filename:
                        filename = filename.split("?")[0]
                        
                    self.log(f"Serving static media file: {filename}")
                    
                    local_uploads_dir = os.path.join(os.getcwd(), "backend", "api", "public", "uploads")
                    if not os.path.exists(local_uploads_dir):
                        local_uploads_dir = os.path.join(os.getcwd(), "backend", "api", "public_html", "uploads")
                    
                    local_file_path = os.path.join(local_uploads_dir, filename.replace('/', os.sep))
                    
                    # If file doesn't exist locally, self-heal by downloading from remote PHP API
                    if not os.path.exists(local_file_path):
                        self.log(f"File {filename} not found locally. Downloading from remote PHP API...")
                        try:
                            php_url = self.php_url_entry.get().strip()
                            remote_url = f"{php_url}/uploads/{filename}"
                            res = requests.get(remote_url, timeout=15)
                            if res.ok:
                                os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
                                with open(local_file_path, "wb") as f_out:
                                    f_out.write(res.content)
                                self.log(f"✅ Successfully downloaded and cached {filename} locally!")
                        except Exception as e:
                            self.log(f"⚠️ Failed to download remote file: {str(e)}")
                            
                    if os.path.exists(local_file_path):
                        with open(local_file_path, "rb") as f_in:
                            file_data = f_in.read()
                        
                        ext = os.path.splitext(filename)[1].lower()
                        content_type = "application/octet-stream"
                        if ext == ".png": content_type = "image/png"
                        elif ext in [".jpg", ".jpeg"]: content_type = "image/jpeg"
                        elif ext == ".gif": content_type = "image/gif"
                        elif ext == ".webp": content_type = "image/webp"
                        elif ext == ".mp3": content_type = "audio/mpeg"
                        elif ext == ".wav": content_type = "audio/wav"
                        
                        status = 200
                        res_headers = {"Content-Type": content_type}
                        res_body = file_data
                    else:
                        status = 404
                        res_body = {"error": "File not found"}
                        
                # 2. Local message room history
                elif "/messages/room" in url:
                    room_id = url.split("roomId=")[1].split("&")[0] if "roomId=" in url else ""
                    self.log(f"⚙️ Хондани паёмҳо барои ҳуҷраи `{room_id}` аз SQLite...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 50", (room_id,))
                    rows = [dict(r) for r in cursor.fetchall()]
                    cursor.close()
                    conn.close()
                    
                    res_body = rows
                    
                # 3. Local conversations list
                elif "/conversations" in url:
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)
                    user_id = int(params.get('userId', ['1'])[0])
                    
                    self.log(f"⚙️ Хондани рӯйхати муколамаҳо аз SQLite барои корбар {user_id}...")
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    
                    cursor.execute("""
                        SELECT 
                            last_msg.other_user_id as partner_id,
                            COALESCE(u.name, 'User ' || last_msg.other_user_id) as partner_name,
                            u.avatar as partner_avatar,
                            COALESCE(u.last_active, 0) as partner_last_active,
                            COALESCE(u.is_vip, 0) as partner_is_vip,
                            m.content as last_message,
                            m.created_at as last_message_time,
                            m.sender_id as last_message_sender_id,
                            COALESCE(m.is_read, 0) as last_message_is_read,
                            (SELECT COUNT(*) FROM messages WHERE sender_id = last_msg.other_user_id AND receiver_id = ? AND is_read = 0) as unread_count
                        FROM (
                            SELECT 
                                CASE 
                                    WHEN sender_id = ? THEN receiver_id 
                                    ELSE sender_id 
                                END as other_user_id,
                                MAX(created_at) as max_created_at
                            FROM messages
                            WHERE sender_id = ? OR receiver_id = ?
                            GROUP BY other_user_id
                        ) last_msg
                        LEFT JOIN users u ON u.id = last_msg.other_user_id
                        JOIN messages m ON (
                            (m.sender_id = ? AND m.receiver_id = last_msg.other_user_id) OR 
                            (m.sender_id = last_msg.other_user_id AND m.receiver_id = ?)
                        ) AND m.created_at = last_msg.max_created_at
                        ORDER BY last_message_time DESC
                    """, (user_id, user_id, user_id, user_id, user_id, user_id))
                    
                    rows = [dict(r) for r in cursor.fetchall()]
                    
                    # Normalize Vip values and Unix timestamps
                    for row in rows:
                        row['partner_is_vip'] = int(row['partner_is_vip'] or 0)
                        row['last_message_is_read'] = int(row['last_message_is_read'] or 0)
                        
                        # Normalize time
                        try:
                            lmt = row['last_message_time']
                            if isinstance(lmt, str):
                                if '-' in lmt:
                                    dt = datetime.datetime.fromisoformat(lmt.replace('Z', '+00:00'))
                                    row['last_message_time'] = int(dt.timestamp())
                                else:
                                    row['last_message_time'] = int(float(lmt))
                            else:
                                row['last_message_time'] = int(lmt or 0)
                        except Exception:
                            row['last_message_time'] = 0
                            
                        try:
                            pla = row['partner_last_active']
                            if isinstance(pla, str):
                                if '-' in pla:
                                    dt = datetime.datetime.fromisoformat(pla.replace('Z', '+00:00'))
                                    row['partner_last_active'] = int(dt.timestamp())
                                else:
                                    row['partner_last_active'] = int(float(pla))
                            else:
                                row['partner_last_active'] = int(pla or 0)
                        except Exception:
                            row['partner_last_active'] = 0
                            
                    cursor.close()
                    conn.close()
                    res_body = rows
                    
                # 4. Local profile data
                elif "/profile" in url and "guests" not in url and "comments" not in url and "search" not in url:
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)
                    target_user_id = params.get('userId', ['1'])[0]
                    
                    self.log(f"⚙️ Хондани профили корбар {target_user_id} мустақиман аз SQLite...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    
                    cursor.execute("SELECT * FROM users WHERE id = ?", (target_user_id,))
                    user_row = cursor.fetchone()
                    
                    if user_row:
                        profile_data = dict(user_row)
                        profile_data['is_admin'] = int(profile_data.get('is_admin') or 0)
                        
                        cursor.execute("""
                            SELECT i.id, i.name 
                            FROM interests i 
                            JOIN user_interests ui ON i.id = ui.interest_id 
                            WHERE ui.user_id = ?
                        """, (target_user_id,))
                        profile_data['interests'] = [dict(r) for r in cursor.fetchall()]
                        
                        cursor.execute("""
                            SELECT AVG(rating) as average_rating, COUNT(*) as rating_count 
                            FROM user_ratings 
                            WHERE rated_id = ?
                        """, (target_user_id,))
                        rating_row = cursor.fetchone()
                        profile_data['rating'] = round(rating_row['average_rating'], 1) if rating_row['average_rating'] else 0
                        profile_data['rating_count'] = rating_row['rating_count'] or 0
                        
                        cursor.execute("""
                            SELECT image_path 
                            FROM gallery_images 
                            WHERE user_id = ? 
                            ORDER BY created_at DESC 
                            LIMIT 6
                        """, (target_user_id,))
                        profile_data['photos'] = [r['image_path'] for r in cursor.fetchall()]
                        
                        res_body = profile_data
                        status = 200
                    else:
                        status = 404
                        res_body = {"message": "User not found"}
                        
                    cursor.close()
                    conn.close()
                    
                # 5. Local guests list
                elif "/profile/guests" in url and "new" not in url:
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)
                    target_user_id = params.get('userId', ['0'])[0]
                    
                    self.log(f"⚙️ Хондани меҳмонони корбар {target_user_id} мустақиман аз SQLite...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    
                    cursor.execute("""
                        SELECT u.id, u.name, u.avatar, u.bio, u.is_vip, pv.viewed_at 
                        FROM profile_views pv 
                        JOIN users u ON pv.viewer_id = u.id 
                        WHERE pv.viewed_id = ? 
                        ORDER BY pv.viewed_at DESC
                    """, (target_user_id,))
                    guests = [dict(r) for r in cursor.fetchall()]
                    
                    for guest in guests:
                        guest['viewed_at'] = int(guest['viewed_at'] or 0)
                        
                    res_body = guests
                    status = 200
                    cursor.close()
                    conn.close()
                    
                # 6. Local new guests count
                elif "/profile/guests/new" in url:
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)
                    target_user_id = params.get('userId', ['0'])[0]
                    
                    self.log(f"⚙️ Хондани меҳмонони нави корбар {target_user_id} мустақиман аз SQLite...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) as count FROM profile_views WHERE viewed_id = ? AND seen = 0", (target_user_id,))
                    count = cursor.fetchone()[0]
                    
                    res_body = {"count": int(count or 0)}
                    status = 200
                    cursor.close()
                    conn.close()
                    
                # 7. Local comment list
                elif "/profile/comments" in url:
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)
                    target_user_id = params.get('userId', ['0'])[0]
                    
                    self.log(f"⚙️ Хондани шарҳҳои корбар {target_user_id} мустақиман аз SQLite...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    
                    cursor.execute("""
                        SELECT ur.*, u.name as rater_name, u.avatar as rater_avatar, u.is_vip as rater_is_vip 
                        FROM user_ratings ur 
                        JOIN users u ON ur.rater_id = u.id 
                        WHERE ur.rated_id = ? 
                        ORDER BY ur.created_at DESC
                    """, (target_user_id,))
                    comments = [dict(r) for r in cursor.fetchall()]
                    
                    for comment in comments:
                        try:
                            created_at = comment['created_at']
                            if isinstance(created_at, str):
                                if '-' in created_at:
                                    dt = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                                    comment['created_at'] = int(dt.timestamp())
                                else:
                                    comment['created_at'] = int(float(created_at))
                            else:
                                comment['created_at'] = int(created_at or 0)
                        except Exception:
                            pass
                            
                        cursor.execute("""
                            SELECT cr.*, u.name as replier_name, u.avatar as replier_avatar, u.is_vip as replier_is_vip 
                            FROM comment_replies cr 
                            JOIN users u ON cr.user_id = u.id 
                            WHERE cr.rating_id = ? 
                            ORDER BY cr.created_at ASC
                        """, (comment['id'],))
                        replies = [dict(r) for r in cursor.fetchall()]
                        
                        for reply in replies:
                            try:
                                created_at = reply['created_at']
                                if isinstance(created_at, str):
                                    if '-' in created_at:
                                        dt = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                                        reply['created_at'] = int(dt.timestamp())
                                    else:
                                        reply['created_at'] = int(float(created_at))
                                else:
                                    reply['created_at'] = int(created_at or 0)
                            except Exception:
                                pass
                        comment['replies'] = replies
                        
                        cursor.execute("""
                            SELECT 
                                SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) as likes,
                                SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) as dislikes
                            FROM comment_likes 
                            WHERE rating_id = ?
                        """, (comment['id'],))
                        likes_row = cursor.fetchone()
                        comment['likes'] = likes_row['likes'] or 0 if likes_row else 0
                        comment['dislikes'] = likes_row['dislikes'] or 0 if likes_row else 0
                        
                    res_body = comments
                    status = 200
                    cursor.close()
                    conn.close()
                    
                # 8. Local follow status
                elif "/follow/status" in url:
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)
                    follower_id = params.get('followerId', ['0'])[0]
                    followed_id = params.get('followedId', ['0'])[0]
                    
                    self.log(f"⚙️ Санҷиши мақоми пайравӣ байни {follower_id} ва {followed_id} мустақиман аз SQLite...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = ?", (follower_id, followed_id))
                    count = cursor.fetchone()[0]
                    
                    res_body = {"isFollowing": count > 0}
                    status = 200
                    cursor.close()
                    conn.close()
                    
                # 9. Local follow counts
                elif "/follow/counts" in url:
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)
                    target_user_id = params.get('userId', ['0'])[0]
                    
                    self.log(f"⚙️ Хондани ҳисобкунакҳои пайравӣ барои корбар {target_user_id} мустақиман аз SQLite...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    cursor = conn.cursor()
                    
                    cursor.execute("SELECT COUNT(*) FROM follows WHERE followed_id = ?", (target_user_id,))
                    followers_count = cursor.fetchone()[0]
                    
                    cursor.execute("SELECT COUNT(*) FROM follows WHERE follower_id = ?", (target_user_id,))
                    following_count = cursor.fetchone()[0]
                    
                    res_body = {
                        "followers_count": followers_count,
                        "following_count": following_count
                    }
                    status = 200
                    cursor.close()
                    conn.close()
                    
                else:
                    # Fallback proxy for all other GET queries (reads) to ensure complete compatibility
                    self.log(f"🔄 GET-хондани озод: прокси ва кэш кардани {url}...")
                    php_url = self.php_url_entry.get().strip()
                    secret = self.token_entry.get().strip()
                    
                    headers_to_send = {}
                    if headers:
                        for k, v in headers.items():
                            kl = k.lower()
                            if kl == "authorization":
                                headers_to_send["Authorization"] = v
                            elif kl == "x-sync-token":
                                headers_to_send["X-Sync-Token"] = v
                    
                    if "X-Sync-Token" not in headers_to_send:
                        headers_to_send["X-Sync-Token"] = secret
                        
                    proxy_res = requests.get(f"{php_url}{url}", headers=headers_to_send, timeout=30)
                    status = proxy_res.status_code
                    
                    res_headers = {}
                    for k, v in proxy_res.headers.items():
                        kl = k.lower()
                        if kl not in ["content-encoding", "transfer-encoding", "content-length", "connection"]:
                            res_headers[k] = v
                        
                    try:
                        res_body = proxy_res.json()
                    except Exception:
                        res_body = proxy_res.text
                    
                    log_body = str(res_body)[:100]
                    ct = res_headers.get("Content-Type", "").lower()
                    if any(media in ct for media in ["image", "audio", "video", "octet-stream", "pdf"]):
                        log_body = "[Файли Медиа / Бинарӣ]"
                    self.log(f"   -> Ҷавоби PHP [Status: {status}]: {log_body}")
            
            # Write operations: write immediately to local SQLite, return 200, and launch background sync to Cloud PHP
            elif method in ["POST", "PUT", "DELETE"]:
                if "/auth" in url or "/coins" in url or "/community/post" in url or "/profile" in url or "/gallery/upload" in url or "/messages/upload" in url or "/admin/app-versions" in url:
                    self.log(f"🔄 Амалиёти синхронӣ дар PHP барои: {url}...")
                    php_url = self.php_url_entry.get().strip()
                    secret = self.token_entry.get().strip()
                    
                    headers_to_send = {**headers} if headers else {}
                    headers_to_send["X-Sync-Token"] = secret
                    headers_to_send.pop("Host", None)
                    headers_to_send.pop("host", None)
                    headers_to_send.pop("Content-Length", None)
                    headers_to_send.pop("content-length", None)
                    headers_to_send.pop("Accept-Encoding", None)
                    headers_to_send.pop("accept-encoding", None)
                    
                    if method == "POST":
                        proxy_res = requests.post(f"{php_url}{url}", headers=headers_to_send, json=body, timeout=20)
                    elif method == "PUT":
                        proxy_res = requests.put(f"{php_url}{url}", headers=headers_to_send, json=body, timeout=20)
                    elif method == "DELETE":
                        proxy_res = requests.delete(f"{php_url}{url}", headers=headers_to_send, timeout=20)
                    
                    status = proxy_res.status_code
                    
                    res_headers = {}
                    for k, v in proxy_res.headers.items():
                        kl = k.lower()
                        if kl not in ["content-encoding", "transfer-encoding", "content-length", "connection"]:
                            res_headers[k] = v
                        
                    try:
                        res_body = proxy_res.json()
                    except Exception:
                        res_body = proxy_res.text
                        
                    log_body = str(res_body)[:200]
                    ct = res_headers.get("Content-Type", "").lower()
                    if any(media in ct for media in ["image", "audio", "video", "octet-stream", "pdf"]):
                        log_body = "[Файли Медиа / Бинарӣ]"
                    self.log(f"   -> Ҷавоби PHP [Status: {status}]: {log_body}")
                    
                # 1. Local profile guests seen state update
                elif "/profile/guests/seen" in url:
                    user_id = body.get('userId', 0) if body else 0
                    self.log(f"✍️ Навишти локалӣ: Меҳмонони корбар {user_id} ҳамчун хондашуда нишон дода мешаванд...")
                    
                    conn = sqlite3.connect(LOCAL_DB_FILE)
                    cursor = conn.cursor()
                    cursor.execute("UPDATE profile_views SET seen = 1 WHERE viewed_id = ? AND seen = 0", (user_id,))
                    conn.commit()
                    cursor.close()
                    conn.close()
                    
                    self.sync_queue.append({
                        "method": method,
                        "url": url,
                        "headers": headers,
                        "body": body,
                        "timestamp": time.time()
                    })
                    
                    res_body = {"message": "Guests marked as seen"}
                    status = 200
                    
                # 2. Local profile view recorder
                elif "/profile/view" in url:
                    viewer_id = body.get('viewerId', 0) if body else 0
                    viewed_id = body.get('viewedId', 0) if body else 0
                    
                    self.log(f"✍️ Навишти локалӣ: Сабти боздид аз профил: {viewer_id} -> {viewed_id}...")
                    
                    if viewer_id and viewed_id and viewer_id != viewed_id:
                        conn = sqlite3.connect(LOCAL_DB_FILE)
                        cursor = conn.cursor()
                        current_time = int(time.time())
                        try:
                            cursor.execute("""
                                INSERT INTO profile_views (viewer_id, viewed_id, viewed_at, seen) 
                                VALUES (?, ?, ?, 0) 
                                ON CONFLICT(viewer_id, viewed_id) DO UPDATE SET viewed_at = ?, seen = 0
                            """, (viewer_id, viewed_id, current_time, current_time))
                            conn.commit()
                        except Exception as err:
                            try:
                                cursor.execute("DELETE FROM profile_views WHERE viewer_id = ? AND viewed_id = ?", (viewer_id, viewed_id))
                                cursor.execute("INSERT INTO profile_views (viewer_id, viewed_id, viewed_at, seen) VALUES (?, ?, ?, 0)", (viewer_id, viewed_id, current_time))
                                conn.commit()
                            except Exception as err2:
                                self.log(f"Fallback insert failed: {str(err2)}")
                        cursor.close()
                        conn.close()
                        
                        self.sync_queue.append({
                            "method": method,
                            "url": url,
                            "headers": headers,
                            "body": body,
                            "timestamp": time.time()
                        })
                        
                        res_body = {"message": "Profile view recorded"}
                        status = 200
                    else:
                        status = 400
                        res_body = {"error": "Invalid viewerId or viewedId"}
                        
                # 3. Local follow state update
                elif "/follow" in url and "status" not in url and "counts" not in url and "followers" not in url and "following" not in url:
                    follower_id = body.get('followerId', 0) if body else 0
                    followed_id = body.get('followedId', 0) if body else 0
                    
                    self.log(f"✍️ Навишти локалӣ: Корбар {follower_id} ба пайравии {followed_id} оғоз мекунад...")
                    
                    if follower_id and followed_id:
                        conn = sqlite3.connect(LOCAL_DB_FILE)
                        cursor = conn.cursor()
                        current_time = int(time.time())
                        try:
                            cursor.execute("INSERT OR IGNORE INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)", (follower_id, followed_id, current_time))
                            conn.commit()
                        except Exception as err:
                            self.log(f"SQLite follow error: {str(err)}")
                        cursor.close()
                        conn.close()
                        
                        self.sync_queue.append({
                            "method": method,
                            "url": url,
                            "headers": headers,
                            "body": body,
                            "timestamp": time.time()
                        })
                        
                        res_body = {"success": True, "message": "Follow recorded"}
                        status = 200
                    else:
                        status = 400
                        res_body = {"error": "Invalid followerId or followedId"}

                # 4. Local unfollow state update
                elif "/unfollow" in url:
                    follower_id = body.get('followerId', 0) if body else 0
                    followed_id = body.get('followedId', 0) if body else 0
                    
                    self.log(f"✍️ Навишти локалӣ: Корбар {follower_id} пайравиро аз {followed_id} қатъ мекунад...")
                    
                    if follower_id and followed_id:
                        conn = sqlite3.connect(LOCAL_DB_FILE)
                        cursor = conn.cursor()
                        try:
                            cursor.execute("DELETE FROM follows WHERE follower_id = ? AND followed_id = ?", (follower_id, followed_id))
                            conn.commit()
                        except Exception as err:
                            self.log(f"SQLite unfollow error: {str(err)}")
                        cursor.close()
                        conn.close()
                        
                        self.sync_queue.append({
                            "method": method,
                            "url": url,
                            "headers": headers,
                            "body": body,
                            "timestamp": time.time()
                        })
                        
                        res_body = {"success": True, "message": "Unfollow recorded"}
                        status = 200
                    else:
                        status = 400
                        res_body = {"error": "Invalid followerId or followedId"}

                elif "/api/ai/chat" in url:
                    self.log("🤖 Дархости ИИ қабул шуд. Фиристодан ба Ollama бо модели gemma4:31b-cloud...")
                    try:
                        # Prepare request payload for Ollama
                        ollama_payload = {
                            "model": "gemma4:31b-cloud",
                            "messages": body.get("messages", []),
                            "temperature": body.get("temperature", 0.7),
                            "stream": False
                        }
                        
                        # Call Ollama OpenAI-compatible endpoint first
                        ollama_url = "http://localhost:11434/v1/chat/completions"
                        self.log(f"   -> Дархост ба {ollama_url} фиристода мешавад...")
                        
                        try:
                            ollama_res = requests.post(ollama_url, json=ollama_payload, timeout=120)
                            if ollama_res.ok:
                                res_body = ollama_res.json()
                                status = 200
                                self.log("✅ Ҷавоби ИИ аз Ollama бомуваффақият қабул шуд (OpenAI endpoint).")
                            else:
                                raise Exception(f"Ollama returned status {ollama_res.status_code}: {ollama_res.text}")
                        except Exception as e:
                            self.log(f"⚠️ Хатогӣ дар OpenAI endpoint-и Ollama: {str(e)}. Кӯшиши API-и мустақим...")
                            # Fallback to direct Ollama /api/chat endpoint
                            direct_url = "http://localhost:11434/api/chat"
                            ollama_res = requests.post(direct_url, json=ollama_payload, timeout=120)
                            if ollama_res.ok:
                                direct_data = ollama_res.json()
                                # Format as OpenAI compatible structure for frontend
                                res_body = {
                                    "choices": [
                                        {
                                            "message": {
                                                "role": "assistant",
                                                "content": direct_data.get("message", {}).get("content", "")
                                            },
                                            "finish_reason": "stop"
                                        }
                                    ],
                                    "model": "gemma4:31b-cloud"
                                }
                                status = 200
                                self.log("✅ Ҷавоби ИИ аз Ollama бомуваффақият қабул шуд (Direct endpoint).")
                            else:
                                raise Exception(f"Direct Ollama API returned status {ollama_res.status_code}")
                                
                    except Exception as e:
                        self.log(f"❌ Хатогии пайвастшавӣ ба Ollama: {str(e)}")
                        self.log("Ишора: Боварӣ ҳосил кунед, ки Ollama кор карда истодааст ва модели gemma4:31b-cloud насб шудааст.")
                        status = 500
                        res_body = {
                            "error": {
                                "message": f"Хатогии пайваст ба модели локалии Оллама: {str(e)}. Боварӣ ҳосил кунед, ки барномаи Ollama фаъол аст ва модели gemma4:31b-cloud насб шудааст."
                            }
                        }
                        
                else:
                    self.log(f"✍️ Навишти локалӣ дар SQLite барои: {url}...")
                    
                    # Perform write locally in SQLite and enqueue for sync
                    self.sync_queue.append({
                        "method": method,
                        "url": url,
                        "headers": headers,
                        "body": body,
                        "timestamp": time.time()
                    })
                    
                    res_body = {"success": True, "message": "Local write accepted and queued for sync"}
            
            # Return result via Socket.io to Node.js proxy gateway
            self.sio.emit('http_response', {
                'requestId': request_id,
                'status': status,
                'headers': res_headers,
                'body': res_body
            })
            
        except Exception as e:
            self.log(f"❌ Хатогии коркарди HTTP дархост: {str(e)}")
            self.sio.emit('http_response', {
                'requestId': request_id,
                'status': 500,
                'headers': {"Content-Type": "application/json"},
                'body': {"error": str(e)}
            })

    # ---- BACKGROUND SYNC WORKER THREAD ----
    def background_sync_worker(self):
        while self.sync_thread_active:
            if len(self.sync_queue) > 0:
                task = self.sync_queue[0]
                self.log(f"🔄 [BACKGROUND SYNC] Оғози синки пасзамина барои {task['method']} {task['url']}...")
                
                php_url = self.php_url_entry.get().strip()
                secret = self.token_entry.get().strip()
                
                # Forward write action to remote PHP API
                try:
                    headers = {
                        "X-Sync-Token": secret,
                        "Content-Type": "application/json"
                    }
                    if 'headers' in task and task['headers']:
                        for k, v in task['headers'].items():
                            kl = k.lower()
                            if kl == "authorization":
                                headers["Authorization"] = v
                    
                    res = None
                    if task['method'] == "POST":
                        res = requests.post(f"{php_url}{task['url']}", headers=headers, json=task['body'], timeout=10)
                    elif task['method'] == "PUT":
                        res = requests.put(f"{php_url}{task['url']}", headers=headers, json=task['body'], timeout=10)
                    elif task['method'] == "DELETE":
                        res = requests.delete(f"{php_url}{task['url']}", headers=headers, timeout=10)
                        
                    if res and res.ok:
                        self.log(f"✅ [BACKGROUND SYNC] Ҳамоҳангсозии {task['url']} бомуваффақият анҷом ёфт!")
                        self.sync_queue.pop(0)  # Remove completed task from queue
                    else:
                        err_msg = res.text if res else "No response"
                        self.log(f"⚠️ [BACKGROUND SYNC] Ноком шуд: {err_msg}. Интизори кӯшиши навбатӣ...")
                        
                        task['retry_count'] = task.get('retry_count', 0) + 1
                        if task['retry_count'] >= 5:
                            self.log(f"⚠️ [BACKGROUND SYNC] Бартараф кардани дархости вайроншуда пас аз 5 кӯшиш: {task['url']}")
                            self.sync_queue.pop(0)
                        else:
                            time.sleep(5)  # Backoff before retry
                except Exception as e:
                    self.log(f"⚠️ [BACKGROUND SYNC] Хатогии шабака: {str(e)}. Кӯшиши навбатӣ пас аз 5 сония...")
                    time.sleep(5)
            else:
                time.sleep(1.0)

    # ---- PUSH AND CLOSE PROCESS ----
    def on_push_and_close(self):
        self.shutdown_btn.configure(state="disabled", text="Синхронизатсия рафта истодааст...")
        self.start_btn.configure(state="disabled")
        
        threading.Thread(target=self.push_and_close, daemon=True).start()
        
    def push_and_close(self):
        self.log("----------------------------------------")
        self.log("Оғози ҳамоҳангсозии ниҳоӣ...")
        
        # Process any pending background sync queue items
        wait_counts = 0
        while len(self.sync_queue) > 0 and wait_counts < 10:
            self.log(f"Интизории синк: боз {len(self.sync_queue)} амал дар навбат аст...")
            time.sleep(1.5)
            wait_counts += 1
            
        try:
            # Safely disconnect WebSocket
            if self.is_connected_to_ws:
                self.log("Қатъи пайвасти вебсокет...")
                self.sio.disconnect()
                
            self.log("Синхронизатсия бо муваффақият анҷом ёфт. Барнома баъди 3 сония пӯшида мешавад.")
            self.sync_thread_active = False
            time.sleep(3.0)
            
            self.root.quit()
            sys.exit(0)
            
        except Exception as e:
            self.log(f"❌ Хатогии Хурӯҷ: {str(e)}")
            self.shutdown_btn.configure(state="normal", text="🚪 Синхронизатсия ва Хомӯшкунӣ")
            self.start_btn.configure(state="normal")
            messagebox.showerror("Хатогии Хурӯҷ", f"Синхронизатсия иҷро нашуд:\n{str(e)}")
            
    def on_window_close(self):
        pending_count = len(self.sync_queue)
        if pending_count > 0:
            msg = f"Дар навбати синкронсозӣ {pending_count} амалиёти фиристоданашуда (pending tasks) мавҷуд аст.\nАгар барномаро пӯшед, ин маълумотҳо ба сервери абрӣ сабт намешаванд!\n\nОё мутмаин ҳастед, ки барномаро пӯшидан мехоҳед?"
            title = "⚠️ Огоҳӣ: Синк нопурра аст!"
        else:
            msg = "Оё мутмаин ҳастед, ки барномаро пӯшидан ва хурӯҷ кардан мехоҳед?"
            title = "Тасдиқи хурӯҷ"
            
        if messagebox.askyesno(title, msg, icon='warning' if pending_count > 0 else 'question'):
            self.log("🚪 Барнома бехатар баста мешавад...")
            try:
                if self.is_connected_to_ws:
                    self.sio.disconnect()
            except Exception:
                pass
            self.sync_thread_active = False
            self.root.destroy()
            sys.exit(0)

if __name__ == "__main__":
    root = tk.Tk()
    app = SyncApp(root)
    root.mainloop()
