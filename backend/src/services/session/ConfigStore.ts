import initSqlJs, { Database } from 'sql.js';
import { logger } from '../../utils/logger.js';
import type { SystemConfig, LLMConfig, SystemParams, User, SearchConfig } from '../../models/Config.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

export class ConfigStore {
  private db: Database | null = null;
  private dbPath: string;
  private initialized = false;

  /**
   * In-memory config cache to avoid repeated SQLite reads for hot-path config lookups.
   * Invalidated on writes via setConfig/deleteConfig.
   */
  private configCache = new Map<string, string | null>();
  private configCacheValid = false;

  /**
   * Debounced save: coalesces multiple rapid writes into a single disk flush.
   * The timer ensures we don't write to disk more than once per 100ms window.
   */
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 100;
  private savePending = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init() {
    if (this.initialized) return;

    const SQL = await initSqlJs();

    // 尝试加载现有数据库
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initTables();
    this.initDefaultConfig();
    // Use immediate save at the end of init to ensure initial state is persisted
    this.saveImmediate();
    this.initialized = true;
  }

  private initTables() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_login_at INTEGER
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        role TEXT,
        content TEXT,
        experts TEXT,
        created_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_type TEXT NOT NULL,
        prompt_name TEXT NOT NULL,
        prompt_content TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER NOT NULL,
        UNIQUE(node_type, prompt_name)
      );
    `);

    logger.info('Database tables initialized');
  }

  private initDefaultConfig() {
    if (!this.db) return;

    const result = this.db.exec('SELECT COUNT(*) as count FROM system_config');
    const count = result[0]?.values[0]?.[0] as number || 0;

    if (count === 0) {
      const now = Date.now();

      // Default LLM config - API key must be configured via admin panel
      this.setConfig('llm.provider', 'openai', 'llm', 'LLM Provider');
      this.setConfig('llm.apiKey', '', 'llm', 'API Key');
      this.setConfig('llm.baseUrl', 'https://api.openai.com/v1', 'llm', 'Base URL');
      this.setConfig('llm.defaultModel', 'gpt-4', 'llm', 'Default Model');

      // Default system params
      this.setConfig('system.maxRounds', '1', 'system', 'Max Rounds');
      this.setConfig('system.qualityThreshold', '0.85', 'system', 'Quality Threshold');
      this.setConfig('system.planningLevel', 'medium', 'system', 'Planning Level');
      this.setConfig('system.expertLevel', 'medium', 'system', 'Expert Level');
      this.setConfig('system.synthesisLevel', 'high', 'system', 'Synthesis Level');

      // Default search config
      this.setConfig('search.provider', 'none', 'search', 'Search Provider');
      this.setConfig('search.exaApiKey', '', 'search', 'Exa API Key');
      this.setConfig('search.tavilyApiKey', '', 'search', 'Tavily API Key');
      this.setConfig('search.maxResults', '5', 'search', 'Max Search Results');
      this.setConfig('search.enabled', 'false', 'search', 'Enable Search');

      // Default admin user (password: admin123)
      // Note: Using sync version here since init is called once at startup
      const passwordHash = bcrypt.hashSync('admin123', 10);
      this.db.run(
        'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)',
        ['admin', passwordHash, 'admin', now]
      );

      logger.info('Default configuration initialized');
    }
  }

  private save() {
    if (!this.db) return;

    // Mark that a save is pending
    this.savePending = true;

    // Debounce: if a timer is already set, the pending flag ensures
    // the latest state will be written when it fires.
    if (this.saveTimer) return;

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.savePending) {
        this.savePending = false;
        this.flushToDisk();
      }
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Immediately persist the database to disk. Called by debounce timer and close().
   */
  private flushToDisk() {
    if (!this.db) return;

    const data = this.db.export();
    const buffer = Buffer.from(data);

    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * Force an immediate save (bypasses debounce). Use sparingly.
   */
  private saveImmediate() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.savePending = false;
    this.flushToDisk();
  }

  /**
   * Invalidate the in-memory config cache after writes.
   */
  private invalidateConfigCache() {
    this.configCache.clear();
    this.configCacheValid = false;
  }

  // Config CRUD
  setConfig(key: string, value: string, category: string, description?: string) {
    if (!this.db) return;

    const now = Date.now();
    this.db.run(
      `INSERT INTO system_config (key, value, category, description, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [key, value, category, description || '', now]
    );
    this.invalidateConfigCache();
    this.save();
  }

  getConfig(key: string): string | null {
    if (!this.db) return null;

    // Check in-memory cache first
    if (this.configCache.has(key)) {
      return this.configCache.get(key) ?? null;
    }

    const result = this.db.exec('SELECT value FROM system_config WHERE key = ?', [key]);
    const value = result[0]?.values[0]?.[0] as string || null;
    this.configCache.set(key, value);
    return value;
  }

  getAllConfig(): SystemConfig[] {
    if (!this.db) return [];

    const result = this.db.exec('SELECT * FROM system_config ORDER BY category, key');
    if (!result[0]) return [];

    return result[0].values.map(row => ({
      id: row[0] as number,
      key: row[1] as string,
      value: row[2] as string,
      category: row[3] as any,
      description: row[4] as string,
      updatedAt: row[5] as number,
    }));
  }

  getConfigByCategory(category: string): SystemConfig[] {
    if (!this.db) return [];

    const result = this.db.exec('SELECT * FROM system_config WHERE category = ?', [category]);
    if (!result[0]) return [];

    return result[0].values.map(row => ({
      id: row[0] as number,
      key: row[1] as string,
      value: row[2] as string,
      category: row[3] as any,
      description: row[4] as string,
      updatedAt: row[5] as number,
    }));
  }

  deleteConfig(key: string) {
    if (!this.db) return;
    this.db.run('DELETE FROM system_config WHERE key = ?', [key]);
    this.invalidateConfigCache();
    this.save();
  }

  // LLM Config helpers
  getLLMConfig(): LLMConfig {
    return {
      provider: this.getConfig('llm.provider') as any || 'openai',
      apiKey: this.getConfig('llm.apiKey') || '',
      baseUrl: this.getConfig('llm.baseUrl') || undefined,
      defaultModel: this.getConfig('llm.defaultModel') || 'gpt-4',
    };
  }

  setLLMConfig(config: Partial<LLMConfig>) {
    if (config.provider !== undefined) this.setConfig('llm.provider', config.provider, 'llm');
    if (config.apiKey !== undefined) this.setConfig('llm.apiKey', config.apiKey, 'llm');
    if (config.baseUrl !== undefined) this.setConfig('llm.baseUrl', config.baseUrl, 'llm');
    if (config.defaultModel !== undefined) this.setConfig('llm.defaultModel', config.defaultModel, 'llm');
  }

  // System params helpers
  getSystemParams(): SystemParams {
    return {
      maxRounds: parseInt(this.getConfig('system.maxRounds') || '5'),
      qualityThreshold: parseFloat(this.getConfig('system.qualityThreshold') || '0.85'),
      planningLevel: this.getConfig('system.planningLevel') as any || 'medium',
      expertLevel: this.getConfig('system.expertLevel') as any || 'medium',
      synthesisLevel: this.getConfig('system.synthesisLevel') as any || 'high',
    };
  }

  setSystemParams(params: Partial<SystemParams>) {
    if (params.maxRounds !== undefined) this.setConfig('system.maxRounds', params.maxRounds.toString(), 'system');
    if (params.qualityThreshold !== undefined) this.setConfig('system.qualityThreshold', params.qualityThreshold.toString(), 'system');
    if (params.planningLevel !== undefined) this.setConfig('system.planningLevel', params.planningLevel, 'system');
    if (params.expertLevel !== undefined) this.setConfig('system.expertLevel', params.expertLevel, 'system');
    if (params.synthesisLevel !== undefined) this.setConfig('system.synthesisLevel', params.synthesisLevel, 'system');
  }

  // Search config helpers
  getSearchConfig(): SearchConfig {
    return {
      provider: this.getConfig('search.provider') as any || 'none',
      exaApiKey: this.getConfig('search.exaApiKey') || '',
      tavilyApiKey: this.getConfig('search.tavilyApiKey') || '',
      maxResults: parseInt(this.getConfig('search.maxResults') || '5'),
      enabled: this.getConfig('search.enabled') === 'true',
    };
  }

  setSearchConfig(config: Partial<SearchConfig>) {
    if (config.provider) this.setConfig('search.provider', config.provider, 'search');
    if (config.exaApiKey !== undefined) this.setConfig('search.exaApiKey', config.exaApiKey, 'search');
    if (config.tavilyApiKey !== undefined) this.setConfig('search.tavilyApiKey', config.tavilyApiKey, 'search');
    if (config.maxResults) this.setConfig('search.maxResults', config.maxResults.toString(), 'search');
    if (config.enabled !== undefined) this.setConfig('search.enabled', config.enabled.toString(), 'search');
  }

  // User management
  createUser(username: string, password: string, role: 'admin' | 'user'): number {
    if (!this.db) return 0;

    const passwordHash = bcrypt.hashSync(password, 10);
    this.db.run(
      'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)',
      [username, passwordHash, role, Date.now()]
    );
    this.save();

    const result = this.db.exec('SELECT last_insert_rowid()');
    return result[0]?.values[0]?.[0] as number || 0;
  }

  getUserById(userId: number): User | null {
    if (!this.db) return null;

    const result = this.db.exec('SELECT * FROM users WHERE id = ?', [userId]);
    if (!result[0] || result[0].values.length === 0) return null;

    const row = result[0].values[0];
    return {
      id: row[0] as number,
      username: row[1] as string,
      passwordHash: row[2] as string,
      role: row[3] as any,
      createdAt: row[4] as number,
      lastLoginAt: row[5] as number | undefined,
    };
  }

  updateUserCredentials(userId: number, username: string, newPassword?: string) {
    if (!this.db) return;

    if (newPassword && newPassword.trim()) {
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      this.db.run(
        'UPDATE users SET username = ?, password_hash = ? WHERE id = ?',
        [username, passwordHash, userId]
      );
    } else {
      this.db.run('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
    }

    this.save();
  }

  cleanupToSingleAdmin(currentAdminId: number) {
    if (!this.db) return;

    this.db.run('DELETE FROM users WHERE id != ?', [currentAdminId]);
    this.db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', currentAdminId]);
    this.save();
  }

  verifyUser(username: string, password: string): User | null {
    if (!this.db) return null;

    // First get the user by username
    const result = this.db.exec(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!result[0] || result[0].values.length === 0) return null;

    const row = result[0].values[0];
    const storedHash = row[2] as string;

    // Verify password with bcrypt
    if (!bcrypt.compareSync(password, storedHash)) {
      return null;
    }

    const user: User = {
      id: row[0] as number,
      username: row[1] as string,
      passwordHash: storedHash,
      role: row[3] as any,
      createdAt: row[4] as number,
      lastLoginAt: row[5] as number | undefined,
    };

    this.db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now(), user.id]);
    this.save();

    return user;
  }

  getAllUsers(): User[] {
    if (!this.db) return [];

    const result = this.db.exec('SELECT id, username, role, created_at, last_login_at FROM users');
    if (!result[0]) return [];

    return result[0].values.map(row => ({
      id: row[0] as number,
      username: row[1] as string,
      passwordHash: '',
      role: row[2] as any,
      createdAt: row[3] as number,
      lastLoginAt: row[4] as number | undefined,
    }));
  }

  deleteUser(userId: number) {
    if (!this.db) return;
    this.db.run('DELETE FROM users WHERE id = ?', [userId]);
    this.save();
  }

  // Prompt management
  setPrompt(nodeType: string, promptName: string, promptContent: string, description?: string) {
    if (!this.db) return;

    const now = Date.now();
    this.db.run(
      `INSERT INTO prompts (node_type, prompt_name, prompt_content, description, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(node_type, prompt_name) DO UPDATE SET
         prompt_content = excluded.prompt_content,
         description = excluded.description,
         updated_at = excluded.updated_at`,
      [nodeType, promptName, promptContent, description || '', now]
    );
    this.save();
  }

  getPrompt(nodeType: string, promptName: string): string | null {
    if (!this.db) return null;

    const result = this.db.exec(
      'SELECT prompt_content FROM prompts WHERE node_type = ? AND prompt_name = ?',
      [nodeType, promptName]
    );
    return result[0]?.values[0]?.[0] as string || null;
  }

  getAllPrompts() {
    if (!this.db) return [];

    const result = this.db.exec('SELECT * FROM prompts ORDER BY node_type, prompt_name');
    if (!result[0]) return [];

    return result[0].values.map(row => ({
      id: row[0],
      nodeType: row[1],
      promptName: row[2],
      promptContent: row[3],
      description: row[4],
      updatedAt: row[5],
    }));
  }

  close() {
    if (this.db) {
      this.saveImmediate();
      this.db.close();
    }
  }
}
