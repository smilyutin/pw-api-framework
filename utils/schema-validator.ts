import fs from 'fs/promises'
import path from 'path'
import Ajv from 'ajv'
import { createSchema } from 'genson-js';

const SCHEMA_BASE_PATH = './responce-schemas'
const ajv = new Ajv({ allErrors: true })

export async function validateSchema(dirName: string, fileName: string, responseBody: object,createSchemaFlag: boolean = false) {
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
            `${ JSON.stringify(responseBody, null, 4) }`
    )
   }
}

async function loadSchema(schemaPath: string) {
    try{
    const schemaContent = await fs.readFile(schemaPath, 'utf-8')
    return JSON.parse(schemaContent)
}   catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to read the schema file: ${ errorMessage }`)
    }
}

async function generateNewSchema(responseBody: object, schemaPath: string) {
    try{
            const generatedSchema = await createSchema(responseBody)
            await fs.mkdir(path.dirname(schemaPath), { recursive: true })
            await fs.writeFile(schemaPath, JSON.stringify(generatedSchema, null, 4), 'utf-8')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to create the schema file: ${ errorMessage }`)
        }}
