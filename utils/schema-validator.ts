import fs from 'fs/promises'
import path from 'path'
import Ajv from 'ajv'
import { createSchema } from 'genson-js';
import addFormats from "ajv-formats"

const SCHEMA_BASE_PATH = './responce-schemas'
const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

export async function validateSchema(dirName: string, fileName: string, responseBody: object, createSchemaFlag: boolean = false) {
    const schemaPath = path.join(SCHEMA_BASE_PATH, dirName, `${fileName}.json`)

    if (createSchemaFlag) await generateNewSchema(responseBody, schemaPath)

    const schema = await loadSchema(schemaPath)
    const validate = ajv.compile(schema)

    const valid = validate(responseBody)
    if (!valid) {
        throw new Error(
            `Schema validation ${fileName}_schema.json failed:\n` +
            `${JSON.stringify(validate.errors, null, 4)})\n\n` +
            `Actual response body: \n` +
            `${JSON.stringify(responseBody, null, 4)}`
        )
    }
}

async function loadSchema(schemaPath: string) {
    try {
        const schemaContent = await fs.readFile(schemaPath, 'utf-8')
        return JSON.parse(schemaContent)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to read the schema file: ${errorMessage}`)
    }
}

function applyDateTimeFormats(schema: any) {
    const targets = new Set(['createdAt', 'updatedAt'])

    function visit(node: any) {
        if (!node || typeof node !== 'object') return

        if (node.type === 'object' && node.properties) {
            for (const [key, prop] of Object.entries<any>(node.properties)) {
                if (targets.has(key) && prop && typeof prop === 'object') {
                    if (Array.isArray(prop.type)) {
                        if (prop.type.includes('string') && !prop.format) {
                            prop.format = 'date-time'
                        }
                    } else {
                        if (!prop.type || prop.type === 'string') {
                            prop.type = 'string'
                            if (!prop.format) prop.format = 'date-time'
                        }
                    }
                }
                visit(prop)
            }
        }

        if (node.type === 'array' && node.items) {
            visit(node.items)
        }

        if (Array.isArray(node.anyOf)) node.anyOf.forEach(visit)
        if (Array.isArray(node.oneOf)) node.oneOf.forEach(visit)
        if (Array.isArray(node.allOf)) node.allOf.forEach(visit)
    }

    visit(schema)
}

async function generateNewSchema(responseBody: object, schemaPath: string) {
    try {
        const generatedSchema: any = await createSchema(responseBody); // semicolon to terminate statement
        applyDateTimeFormats(generatedSchema)
        await fs.mkdir(path.dirname(schemaPath), { recursive: true })
        await fs.writeFile(schemaPath, JSON.stringify(generatedSchema, null, 4), 'utf-8')
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to create the schema file: ${errorMessage}`)
    }
}
