import { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'

export interface ArticleData {
    title: string
    description: string
    body: string
    tags: string
}

export interface LoginCredentials {
    email: string
    password: string
}

/**
 * Signs in a user through the UI
 */
export async function signIn(page: Page, credentials: LoginCredentials, uiUrl: string): Promise<void> {
    await page.goto(uiUrl)
    await page.getByRole('link', { name: 'Sign in' }).click()
    await page.getByPlaceholder('Email').fill(credentials.email)
    await page.getByPlaceholder('Password').fill(credentials.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Wait for successful login
    await page.waitForURL(/^((?!login).)*$/)
}

/**
 * Creates a new article through the UI
 * Assumes user is already signed in
 * Returns the article data that was used
 */
export async function createArticle(
    page: Page, 
    articleData?: Partial<ArticleData>
): Promise<ArticleData> {
    // Generate article data if not provided
    const data: ArticleData = {
        title: articleData?.title ?? faker.lorem.sentence(5),
        description: articleData?.description ?? faker.lorem.sentences(2),
        body: articleData?.body ?? faker.lorem.paragraphs(3),
        tags: articleData?.tags ?? faker.lorem.word()
    }
    
    // Navigate to New Article page
    await page.getByRole('link', { name: 'New Article' }).click()
    
    // Fill in article form
    await page.getByPlaceholder('Article Title').fill(data.title)
    await page.getByPlaceholder('What\'s this article about?').fill(data.description)
    await page.getByPlaceholder('Write your article (in markdown)').fill(data.body)
    await page.getByPlaceholder('Enter tags').fill(data.tags)
    
    // Publish article
    await page.getByRole('button', { name: 'Publish Article' }).click()
    
    // Wait for article page to load
    await page.waitForURL(/.*article\/.*/)
    
    return data
}

/**
 * Updates an existing article through the UI
 * Assumes you're already on the article page
 * Returns the updated article data
 */
export async function updateArticle(
    page: Page,
    updatedData: Partial<ArticleData>
): Promise<ArticleData> {
    // Generate updated data for any fields not provided
    const data: ArticleData = {
        title: updatedData.title ?? faker.lorem.sentence(5),
        description: updatedData.description ?? faker.lorem.sentences(2),
        body: updatedData.body ?? faker.lorem.paragraphs(3),
        tags: updatedData.tags ?? faker.lorem.word()
    }
    
    // Click Edit Article button
    await page.getByRole('link', { name: 'Edit Article' }).first().click()
    
    // Verify we're on the editor page
    await page.waitForURL(/.*editor\/.*/)
    
    // Wait for form to be ready
    await page.getByPlaceholder('Article Title').waitFor({ state: 'visible' })
    
    // Clear and fill in updated data
    await page.getByPlaceholder('Article Title').fill('')
    await page.getByPlaceholder('Article Title').fill(data.title)
    
    await page.getByPlaceholder('What\'s this article about?').fill('')
    await page.getByPlaceholder('What\'s this article about?').fill(data.description)
    
    await page.getByPlaceholder('Write your article (in markdown)').fill('')
    await page.getByPlaceholder('Write your article (in markdown)').fill(data.body)
    
    // Handle tags - remove existing tags if present
    const tagRemoveButtons = page.locator('.tag-list .ion-close-round')
    const tagCount = await tagRemoveButtons.count()
    for (let i = 0; i < tagCount; i++) {
        await tagRemoveButtons.first().click()
        await page.waitForTimeout(100)
    }
    
    // Add new tag
    await page.getByPlaceholder('Enter tags').fill(data.tags)
    await page.keyboard.press('Enter')
    
    // Publish updated article
    await page.getByRole('button', { name: 'Publish Article' }).click()
    
    // Wait for article page to load
    await page.waitForURL(/.*article\/.*/)
    
    return data
}
