import { promises as fs } from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clone(value) {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeScalar(value) {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return value;
  }

  return value;
}

function normalizeDocument(value) {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDocument(item));
  }

  if (isPlainObject(value)) {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = normalizeDocument(entry);
    }
    return result;
  }

  return value;
}

function getByPath(document, dottedPath) {
  if (!dottedPath) return undefined;
  const segments = String(dottedPath).split('.');
  let current = document;

  for (const segment of segments) {
    if (current == null) return undefined;
    current = current[segment];
  }

  return current;
}

function parseComparable(value) {
  const normalized = normalizeScalar(value);
  if (normalized === null || normalized === undefined) {
    return null;
  }

  if (typeof normalized === 'number') {
    return normalized;
  }

  if (normalized instanceof Date) {
    return normalized.getTime();
  }

  if (typeof normalized === 'string') {
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    return normalized;
  }

  return normalized;
}

function valuesEqual(left, right) {
  const normalizedLeft = normalizeScalar(left);
  const normalizedRight = normalizeScalar(right);

  if (normalizedLeft instanceof Date || normalizedRight instanceof Date) {
    return parseComparable(normalizedLeft) === parseComparable(normalizedRight);
  }

  if (typeof normalizedLeft === 'object' || typeof normalizedRight === 'object') {
    return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
  }

  return String(normalizedLeft) === String(normalizedRight);
}

function matchesCondition(documentValue, condition) {
  if (condition instanceof RegExp) {
    return condition.test(String(documentValue ?? ''));
  }

  if (!isPlainObject(condition)) {
    return valuesEqual(documentValue, condition);
  }

  const operatorKeys = Object.keys(condition).filter((key) => key.startsWith('$'));
  if (operatorKeys.length === 0) {
    return valuesEqual(documentValue, condition);
  }

  for (const key of operatorKeys) {
    const operand = condition[key];

    if (key === '$in') {
      if (!Array.isArray(operand)) return false;
      if (!operand.some((item) => valuesEqual(documentValue, item))) return false;
      continue;
    }

    if (key === '$ne') {
      if (valuesEqual(documentValue, operand)) return false;
      continue;
    }

    if (key === '$eq') {
      if (!valuesEqual(documentValue, operand)) return false;
      continue;
    }

    if (key === '$exists') {
      const exists = documentValue !== undefined;
      if (Boolean(operand) !== exists) return false;
      continue;
    }

    if (key === '$regex') {
      const flags = String(condition.$options || '');
      const regex = operand instanceof RegExp ? operand : new RegExp(String(operand), flags);
      if (!regex.test(String(documentValue ?? ''))) return false;
      continue;
    }

    if (key === '$options') {
      continue;
    }

    return false;
  }

  return true;
}

function matchesFilter(document, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$or') {
      if (!Array.isArray(condition) || !condition.some((entry) => matchesFilter(document, entry))) {
        return false;
      }
      continue;
    }

    if (key === '$and') {
      if (!Array.isArray(condition) || !condition.every((entry) => matchesFilter(document, entry))) {
        return false;
      }
      continue;
    }

    const documentValue = getByPath(document, key);
    if (!matchesCondition(documentValue, condition)) {
      return false;
    }
  }

  return true;
}

function setByPath(document, dottedPath, value) {
  const segments = String(dottedPath).split('.');
  let current = document;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!isPlainObject(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function unsetByPath(document, dottedPath) {
  const segments = String(dottedPath).split('.');
  let current = document;

  for (let index = 0; index < segments.length - 1; index += 1) {
    current = current?.[segments[index]];
    if (!isPlainObject(current)) {
      return;
    }
  }

  if (isPlainObject(current)) {
    delete current[segments[segments.length - 1]];
  }
}

function buildUpsertDocument(filter = {}, update = {}) {
  const document = {};

  for (const [key, value] of Object.entries(filter || {})) {
    if (!String(key).startsWith('$') && !isPlainObject(value)) {
      setByPath(document, key, clone(normalizeDocument(value)));
    }
  }

  applyUpdate(document, update, true);
  return document;
}

function applyUpdate(document, update = {}, isInsert = false) {
  if (!isPlainObject(update)) {
    return document;
  }

  const nextDocument = document;

  if (update.$setOnInsert && isInsert) {
    for (const [key, value] of Object.entries(update.$setOnInsert)) {
      setByPath(nextDocument, key, clone(normalizeDocument(value)));
    }
  }

  if (update.$set) {
    for (const [key, value] of Object.entries(update.$set)) {
      setByPath(nextDocument, key, clone(normalizeDocument(value)));
    }
  }

  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      const current = Number(getByPath(nextDocument, key) || 0);
      setByPath(nextDocument, key, current + Number(value || 0));
    }
  }

  if (update.$push) {
    for (const [key, value] of Object.entries(update.$push)) {
      const existing = getByPath(nextDocument, key);
      const list = Array.isArray(existing) ? existing.slice() : [];

      if (isPlainObject(value) && Array.isArray(value.$each)) {
        for (const item of value.$each) {
          list.push(clone(normalizeDocument(item)));
        }
      } else {
        list.push(clone(normalizeDocument(value)));
      }

      setByPath(nextDocument, key, list);
    }
  }

  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) {
      unsetByPath(nextDocument, key);
    }
  }

  return nextDocument;
}

class LocalCursor {
  constructor(collection, documents, projection = null) {
    this.collection = collection;
    this.documents = documents;
    this.projection = projection;
    this.sortSpec = null;
    this.skipCount = 0;
    this.limitCount = null;
  }

  sort(spec = {}) {
    this.sortSpec = spec;
    return this;
  }

  skip(value = 0) {
    this.skipCount = Math.max(0, Number(value) || 0);
    return this;
  }

  limit(value = 0) {
    const nextValue = Number(value) || 0;
    this.limitCount = nextValue > 0 ? nextValue : null;
    return this;
  }

  project(projection = null) {
    this.projection = projection;
    return this;
  }

  _applySort(documents) {
    if (!this.sortSpec || Object.keys(this.sortSpec).length === 0) {
      return documents;
    }

    const entries = Object.entries(this.sortSpec);
    return documents.slice().sort((left, right) => {
      for (const [key, direction] of entries) {
        const leftValue = parseComparable(getByPath(left, key));
        const rightValue = parseComparable(getByPath(right, key));

        if (leftValue === rightValue) {
          continue;
        }

        const multiplier = Number(direction) >= 0 ? 1 : -1;

        if (leftValue === null || leftValue === undefined) return -1 * multiplier;
        if (rightValue === null || rightValue === undefined) return 1 * multiplier;

        if (typeof leftValue === 'number' && typeof rightValue === 'number') {
          return (leftValue - rightValue) * multiplier;
        }

        return String(leftValue).localeCompare(String(rightValue)) * multiplier;
      }

      return 0;
    });
  }

  _applyProjection(document) {
    if (!this.projection) {
      return clone(document);
    }

    const projectionEntries = Object.entries(this.projection);
    const includeFields = projectionEntries.filter(([, value]) => Boolean(value)).map(([key]) => key);
    const excludeFields = projectionEntries.filter(([, value]) => value === 0).map(([key]) => key);

    if (includeFields.length > 0) {
      const projected = {};
      for (const field of includeFields) {
        if (field === '_id' && this.projection._id === 0) {
          continue;
        }
        const value = getByPath(document, field);
        if (value !== undefined) {
          setByPath(projected, field, clone(value));
        }
      }

      if (this.projection._id !== 0 && document._id !== undefined) {
        projected._id = clone(document._id);
      }

      return projected;
    }

    const projected = clone(document);
    for (const field of excludeFields) {
      unsetByPath(projected, field);
    }

    return projected;
  }

  _sliceDocuments() {
    let result = this._applySort(this.documents);

    if (this.skipCount > 0) {
      result = result.slice(this.skipCount);
    }

    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }

  async toArray() {
    return this._sliceDocuments().map((document) => this._applyProjection(document));
  }

  async next() {
    const [nextDocument] = await this.toArray();
    return nextDocument || null;
  }
}

class LocalCollection {
  constructor(database, name) {
    this.database = database;
    this.name = name;
  }

  _getDocuments() {
    return this.database._getCollectionDocuments(this.name);
  }

  async createIndex() {
    return { acknowledged: true };
  }

  async drop() {
    delete this.database.data.collections[this.name];
    await this.database.persist();
    return { acknowledged: true };
  }

  find(filter = {}, options = {}) {
    const documents = this._getDocuments().filter((document) => matchesFilter(document, filter));
    return new LocalCursor(this, documents, options.projection || null);
  }

  async findOne(filter = {}, options = {}) {
    const [document] = await this.find(filter, options).limit(1).toArray();
    return document || null;
  }

  async insertOne(document) {
    const nextDocument = normalizeDocument(document || {});
    if (nextDocument._id === undefined || nextDocument._id === null) {
      nextDocument._id = new ObjectId().toHexString();
    } else {
      nextDocument._id = normalizeScalar(nextDocument._id);
    }

    this._getDocuments().push(nextDocument);
    await this.database.persist();

    return {
      acknowledged: true,
      insertedId: nextDocument._id,
      insertedCount: 1,
    };
  }

  async updateOne(filter, update, options = {}) {
    const documents = this._getDocuments();
    const index = documents.findIndex((document) => matchesFilter(document, filter));

    if (index === -1) {
      if (!options.upsert) {
        return {
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0,
        };
      }

      const upsertedDocument = buildUpsertDocument(filter, update);
      if (upsertedDocument._id === undefined || upsertedDocument._id === null) {
        upsertedDocument._id = new ObjectId().toHexString();
      }

      documents.push(normalizeDocument(upsertedDocument));
      await this.database.persist();

      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: upsertedDocument._id,
      };
    }

    const updatedDocument = applyUpdate(clone(documents[index]), update, false);
    documents[index] = normalizeDocument(updatedDocument);
    await this.database.persist();

    return {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
    };
  }

  async updateMany(filter, update, options = {}) {
    const documents = this._getDocuments();
    let matchedCount = 0;
    let modifiedCount = 0;

    documents.forEach((document, index) => {
      if (!matchesFilter(document, filter)) {
        return;
      }

      matchedCount += 1;
      const updatedDocument = applyUpdate(clone(document), update, false);
      documents[index] = normalizeDocument(updatedDocument);
      modifiedCount += 1;
    });

    if (matchedCount > 0) {
      await this.database.persist();
    } else if (options.upsert) {
      const upsertedDocument = buildUpsertDocument(filter, update);
      if (upsertedDocument._id === undefined || upsertedDocument._id === null) {
        upsertedDocument._id = new ObjectId().toHexString();
      }

      documents.push(normalizeDocument(upsertedDocument));
      await this.database.persist();

      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: upsertedDocument._id,
      };
    }

    return {
      acknowledged: true,
      matchedCount,
      modifiedCount,
      upsertedCount: 0,
    };
  }

  async deleteOne(filter) {
    const documents = this._getDocuments();
    const index = documents.findIndex((document) => matchesFilter(document, filter));

    if (index === -1) {
      return { acknowledged: true, deletedCount: 0 };
    }

    documents.splice(index, 1);
    await this.database.persist();
    return { acknowledged: true, deletedCount: 1 };
  }

  async deleteMany(filter) {
    const documents = this._getDocuments();
    const remaining = documents.filter((document) => !matchesFilter(document, filter));
    const deletedCount = documents.length - remaining.length;

    if (deletedCount > 0) {
      this.database.data.collections[this.name] = remaining;
      await this.database.persist();
    }

    return { acknowledged: true, deletedCount };
  }

  async countDocuments(filter = {}) {
    return this._getDocuments().filter((document) => matchesFilter(document, filter)).length;
  }

  aggregate(pipeline = []) {
    let documents = this._getDocuments().map((document) => clone(document));

    for (const stage of pipeline) {
      if (stage?.$match) {
        documents = documents.filter((document) => matchesFilter(document, stage.$match));
        continue;
      }

      if (stage?.$sort) {
        documents = new LocalCursor(this, documents).sort(stage.$sort)._sliceDocuments();
        continue;
      }

      if (stage?.$group) {
        const groupSpec = stage.$group;
        const groupIdSpec = groupSpec._id;
        const grouped = new Map();

        for (const document of documents) {
          const groupId = typeof groupIdSpec === 'string' && groupIdSpec.startsWith('$')
            ? getByPath(document, groupIdSpec.slice(1))
            : groupIdSpec;

          const key = JSON.stringify(normalizeDocument(groupId));
          if (!grouped.has(key)) {
            grouped.set(key, { _id: normalizeDocument(groupId) });
          }

          const bucket = grouped.get(key);
          for (const [field, expression] of Object.entries(groupSpec)) {
            if (field === '_id') continue;

            if (isPlainObject(expression) && expression.$sum !== undefined) {
              const operand = expression.$sum;
              const current = Number(bucket[field] || 0);
              const increment = typeof operand === 'string' && operand.startsWith('$')
                ? Number(getByPath(document, operand.slice(1)) || 0)
                : Number(operand || 0);

              bucket[field] = current + increment;
            }
          }
        }

        documents = Array.from(grouped.values());
      }
    }

    return new LocalCursor(this, documents);
  }
}

class LocalDatabase {
  constructor(filePath, dbName) {
    this.filePath = filePath;
    this.dbName = dbName;
    this.data = { collections: {} };
    this.collections = new Map();
    this.persistQueue = Promise.resolve();
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.collections) {
        this.data = parsed;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async persist() {
    const nextWrite = async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    };

    this.persistQueue = this.persistQueue.catch(() => {}).then(nextWrite);
    await this.persistQueue;
  }

  _getCollectionDocuments(name) {
    if (!this.data.collections[name]) {
      this.data.collections[name] = [];
    }

    return this.data.collections[name];
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new LocalCollection(this, name));
    }

    this._getCollectionDocuments(name);
    return this.collections.get(name);
  }

  listCollections(filter = {}) {
    const requestedName = String(filter?.name || '');
    const collectionNames = Object.keys(this.data.collections || {});
    const matchedNames = requestedName
      ? collectionNames.filter((name) => name === requestedName)
      : collectionNames;

    return {
      async hasNext() {
        return matchedNames.length > 0;
      },
      async toArray() {
        return matchedNames.map((name) => ({ name }));
      },
    };
  }

  async dropDatabase() {
    this.data = { collections: {} };
    await this.persist();
  }

  async close() {
    await this.persist();
  }
}

export async function createLocalDatabase({ dbName = 'hunchmate', filePath } = {}) {
  const resolvedPath = filePath || path.resolve(process.cwd(), 'server', '.local-db', `${dbName}.json`);
  const database = new LocalDatabase(resolvedPath, dbName);
  await database.load();
  return database;
}
