import * as esbuild from "esbuild"
import * as fs from "fs/promises"
import {sassPlugin} from 'esbuild-sass-plugin'
import * as http from "http"
import {buildParserFile} from "@lezer/generator"
import * as child_process from "child_process"

// todo: live reload

const RUN_MODE = process.argv[2]

if (RUN_MODE !== "build" && RUN_MODE !== "serve") {
	console.error("Usage: build.mjs <build|serve>")
	process.exit(1)
}

const OUT_DIR = "dist"

const gitSha = await new Promise((resolve) => {
	child_process.exec("git rev-parse HEAD", (err, stdout, stderr) => {
		resolve(stdout.trim())
	})
})

const toolsImporter = {
	name: "tools-importer",
	setup(build) {
		build.onResolve({filter: /^\.\/tools\/\*$/}, async (args) => {
			if (args.resolveDir === '') {
				return // Ignore unresolvable paths
			}

			return {
				path: args.path,
				namespace: toolsImporter.name,
				pluginData: {
					resolveDir: args.resolveDir,
				},
				watchDirs: ["src/tools"],
			}
		})

		build.onLoad({filter: /.*/, namespace: toolsImporter.name}, async (args) => {
			const files = await fs.readdir("src/tools")

			const lines = files.sort().flatMap((module, index) => [
				`import m${index} from "src/tools/${module}"`,
				`modules["${module}"] = {default: m${index}}`,
			])

			lines.unshift("const modules = {}")
			lines.push("export default modules")

			return {contents: lines.join("\n"), resolveDir: args.pluginData.resolveDir}
		})
	}
}

const ejsImporter = {
	name: "ejs-importer",
	setup(build) {
		build.onResolve({filter: /\.ejs$/}, async (args) => {
			if (args.resolveDir === '') {
				return // Ignore unresolvable paths
			}

			return {
				path: args.path,
				namespace: ejsImporter.name,
				pluginData: {
					resolveDir: args.resolveDir,
				},
			}
		})

		build.onLoad({filter: /.*/, namespace: ejsImporter.name}, async (args) => {
			return {
				contents: await fs.readFile(resolve(args.path), "utf8"),
				loader: "text",
			}
		})
	}
}

// Importing Lezer grammar files. Ref: <https://lezer.codemirror.net/docs/ref/#generator>.
const grammarImporter = {
	name: "grammar-importer",
	setup(build) {
		build.onResolve({filter: /\.grammar$/}, async (args) => {
			if (args.resolveDir === '') {
				return // Ignore unresolvable paths
			}

			return {
				path: args.path,
				namespace: grammarImporter.name,
				pluginData: {
					resolveDir: args.resolveDir,
				},
			}
		})

		build.onLoad({filter: /.*/, namespace: grammarImporter.name}, async (args) => {
			const grammarText = await fs.readFile(resolve(args.path), "utf8")
			const {parser, terms} = buildParserFile(grammarText, {
				fileName: args.path,
			})
			return {
				contents: parser + "\n\n" + terms,
				resolveDir: args.pluginData.resolveDir,
			}
		})
	}
}

function resolve(path) {
	return path.replace(/^~/, "./").replaceAll(/\/{2,}/g, "/")
}

const BUILD_OPTIONS = {
	// logLevel: "debug",
	entryPoints: [
		"src/main.ts",
		"styles.sass",
	],
	outdir: OUT_DIR,
	bundle: true,
	minify: true,
	sourcemap: true,
	target: [
		"es2020",
	],
	plugins: [
		toolsImporter,
		grammarImporter,
		ejsImporter,
		sassPlugin(),
	],
	define: {
		BUILD_GIT_SHA: JSON.stringify(gitSha),
		IS_DEV: JSON.stringify(RUN_MODE === "serve"),
	},
}

await fs.rm(OUT_DIR, {recursive: true, force: true})

if (RUN_MODE === "build") {
	const result = await esbuild.build(BUILD_OPTIONS)
	console.log(result)
	await fs.copyFile("static/index.html", `${OUT_DIR}/index.html`)
	process.exit(result.errors.length > 0 ? 1 : 0)

} else if (RUN_MODE === "serve") {
	const context = await esbuild.context(BUILD_OPTIONS)

	await context.watch()

	await context.serve({
		port: 3062,
		fallback: "static/index.html",
	})

	http.createServer((req, res) => {
		const proxyReq = http.request({
			hostname: "127.0.0.1",
			port: req.url.startsWith("/x/") ? 3061 : 3062,
			path: req.url,
			method: req.method,
			headers: req.headers,
		}, (proxyRes) => {
			console.log(proxyRes.statusCode, req.method, req.url)
			res.writeHead(proxyRes.statusCode, proxyRes.headers)
			proxyRes.pipe(res, {end: true})
		})

		req.pipe(proxyReq, {end: true})
	}).listen(3060)

}
