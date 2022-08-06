import { reformatJSON } from "~/src/tools/json"

test("json objects", () => {
	expect(reformatJSON(`{"a":1}`)).toEqual(`{\n  "a": 1\n}`)
	expect(reformatJSON(`{"a":1,"b":2}`)).toEqual(`{\n  "a": 1,\n  "b": 2\n}`)
	expect(reformatJSON(`{"a":1,"b":{"c":2}}`)).toEqual(`{\n  "a": 1,\n  "b": {\n    "c": 2\n  }\n}`)
	expect(reformatJSON(`{"a":1,"b":{"c":{"d":"xyz"}}}`)).toEqual(`{\n  "a": 1,\n  "b": {\n    "c": {\n      "d": "xyz"\n    }\n  }\n}`)
})

test("json arrays", () => {
	expect(reformatJSON(`[1]`)).toEqual(`[\n  1\n]`)
	expect(reformatJSON(`[1,2,3]`)).toEqual(`[\n  1,\n  2,\n  3\n]`)
	expect(reformatJSON(`["a","x"]`)).toEqual(`[\n  "a",\n  "x"\n]`)
	expect(reformatJSON(`[[[1]]]`)).toEqual(`[\n  [\n    [\n      1\n    ]\n  ]\n]`)
	expect(reformatJSON(`[["a","x"],["b","y"]]`)).toEqual(`[\n  [\n    "a",\n    "x"\n  ],\n  [\n    "b",\n    "y"\n  ]\n]`)
})

test("json objects and arrays nested", () => {
	expect(reformatJSON(`{"a":[1]}`)).toEqual(`{\n  "a": [\n    1\n  ]\n}`)
})

test("single quoted strings", () => {
	expect(reformatJSON(`['a']`)).toEqual(`[\n  'a'\n]`)
	expect(reformatJSON(`{'a':1}`)).toEqual(`{\n  'a': 1\n}`)
})

test("identifier keys in objects", () => {
	expect(reformatJSON(`{a: 1}`)).toEqual(`{\n  a: 1\n}`)
	expect(reformatJSON(`{$set: 1}`)).toEqual(`{\n  $set: 1\n}`)
})

test("identifiers in arryas", () => {
	expect(reformatJSON(`[a]`)).toEqual(`[\n  a\n]`)
	expect(reformatJSON(`[a, [a, b, 2]]`)).toEqual(`[\n  a,\n  [\n    a,\n    b,\n    2\n  ]\n]`)
})

test("trailing commas in objects", () => {
	expect(reformatJSON(`{a: 1,}`)).toEqual(`{\n  a: 1,\n}`)
	expect(reformatJSON(`{a: {b: 1, c: 2,},}`)).toEqual(`{\n  a: {\n    b: 1,\n    c: 2,\n  },\n}`)
})

test("trailing commas in arrays", () => {
	expect(reformatJSON(`[1, 2, 3,]`)).toEqual(`[\n  1,\n  2,\n  3,\n]`)
	expect(reformatJSON(`["a","b",["c","d",],]`)).toEqual(`[\n  "a",\n  "b",\n  [\n    "c",\n    "d",\n  ],\n]`)
})

test("numbers from JSON5", () => {
	expect(reformatJSON(`{pos: +1, neg: -2, lead: .123, trail: 123., hex: 0xabcd}`)).toEqual(`{\n  pos: +1,\n  neg: -2,\n  lead: .123,\n  trail: 123.,\n  hex: 0xabcd\n}`)
})

test("line comments", () => {
	expect(reformatJSON(`[1,2, // some comment\n3]`)).toEqual(`[\n  1,\n  2, // some comment\n  3\n]`)
})

test("MongoDB values", () => {
	expect(reformatJSON(`{a: ObjectId("abc")}`)).toEqual(`{\n  a: ObjectId("abc")\n}`)
})

test("empty arrays and objects", () => {
	expect(reformatJSON(`{a: [], b: {}}`)).toEqual(`{\n  a: [],\n  b: {}\n}`)
})
