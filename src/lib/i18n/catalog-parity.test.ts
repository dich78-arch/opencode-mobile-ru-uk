// Guards against locale drift: every locale catalog must expose exactly the
// same set of translation keys as en.json, or i18next silently falls back to
// the key path (en) / nothing sensible (missing copy) at runtime. Run with
// plain `node --test` — no i18next/expo-localization imports needed, same
// as locale-resolve.test.ts.
import { test } from "node:test"
import assert from "node:assert/strict"
import en from "./en.json" with { type: "json" }
import zhHans from "./zh-Hans.json" with { type: "json" }
import ru from "./ru.json" with { type: "json" }
import uk from "./uk.json" with { type: "json" }

// Flattens a nested translation object into dotted leaf-key paths, e.g.
// { settings: { language: { label: "..." } } } -> ["settings.language.label"]
function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix]
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === "object" && value !== null) {
      keys.push(...flattenKeys(value, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

const catalogs = { en, "zh-Hans": zhHans, ru, uk } as const

for (const [name, catalog] of Object.entries(catalogs)) {
  if (name === "en") continue
  test(`${name}.json exposes identical translation keys to en.json`, () => {
    const enKeys = new Set(flattenKeys(en))
    const otherKeys = new Set(flattenKeys(catalog))

    const missingFromOther = [...enKeys].filter((k) => !otherKeys.has(k)).sort()
    const missingFromEn = [...otherKeys].filter((k) => !enKeys.has(k)).sort()

    assert.deepEqual(missingFromOther, [], `keys present in en.json but missing from ${name}.json: ${missingFromOther.join(", ")}`)
    assert.deepEqual(missingFromEn, [], `keys present in ${name}.json but missing from en.json: ${missingFromEn.join(", ")}`)
  })
}

for (const [name, catalog] of Object.entries(catalogs)) {
  test(`no translation value in ${name}.json is an empty string`, () => {
    const keys = flattenKeys(catalog)
    for (const key of keys) {
      const value = key.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], catalog)
      assert.notEqual(value, "", `${name}.json: "${key}" is an empty string`)
    }
  })
}
