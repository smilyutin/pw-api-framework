import { test } from '../../utils/fixtures'
import { expect } from '../../utils/custom-expect'
import { faker } from '@faker-js/faker'

test.describe('UI Smoke Tests - Authentication and Article Management', () => {
    test('User can sign in successfully', async ({ page, config }) => {
        // Navigate to the application
        await page.goto(config.uiUrl)
        
        // Click on "Sign in" link in navigation
        await page.getByRole('link', { name: 'Sign in' }).click()
        
        // Verify we're on the login page
        await expect(page).toHaveURL(/.*login/)
        
        // Fill in login credentials using the same config as API tests
        await page.getByPlaceholder('Email').fill(config.userEmail)
        await page.getByPlaceholder('Password').fill(config.userPassword)
        
        // Click Sign in button
        await page.getByRole('button', { name: 'Sign in' }).click()
        
        // Wait for navigation to complete and verify successful login
        await page.waitForURL(/^((?!login).)*$/) // Wait until URL doesn't contain 'login'
        
        // Verify user is logged in by checking for user-specific navigation elements
        await expect(page.getByRole('link', { name: 'New Article' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
        
        // Verify we're redirected to home page
        await expect(page).toHaveURL(/\/$/)
    })

    test('Create new article and delete it from home', async ({ page, config }) => {
        // Generate random article data using faker (same approach as API tests)
        const articleTitle = faker.lorem.sentence(5)
        const articleDescription = faker.lorem.sentences(2)
        const articleBody = faker.lorem.paragraphs(3)
        const articleTags = faker.lorem.word()
        
        // Navigate to the application and sign in
        await page.goto(config.uiUrl)
        await page.getByRole('link', { name: 'Sign in' }).click()
        await page.getByPlaceholder('Email').fill(config.userEmail)
        await page.getByPlaceholder('Password').fill(config.userPassword)
        await page.getByRole('button', { name: 'Sign in' }).click()
        
        // Wait for successful login
        await page.waitForURL(/^((?!login).)*$/)
        
        // Navigate to New Article page
        await page.getByRole('link', { name: 'New Article' }).click()
        await expect(page).toHaveURL(/.*editor/)
        
        // Fill in article form
        await page.getByPlaceholder('Article Title').fill(articleTitle)
        await page.getByPlaceholder('What\'s this article about?').fill(articleDescription)
        await page.getByPlaceholder('Write your article (in markdown)').fill(articleBody)
        await page.getByPlaceholder('Enter tags').fill(articleTags)
        
        // Publish article
        await page.getByRole('button', { name: 'Publish Article' }).click()
        
        // Verify article was created and we're on the article page
        await page.waitForURL(/.*article\/.*/)
        await expect(page.locator('h1').first()).toContainText(articleTitle)
        
        // Verify article content is displayed
        await expect(page.locator('.article-content')).toContainText(articleBody)
        
        // Click on home to see the article in the feed
        await page.getByRole('link', { name: 'Home' }).first().click()
        await expect(page).toHaveURL(/\/$/)
        
        // Verify article appears in the feed
        await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible()
        
        // Click on the article to open it
        await page.getByRole('heading', { name: articleTitle }).click()
        
        // Delete the article
        await page.getByRole('button', { name: 'Delete Article' }).first().click()
        
        // Verify we're redirected to home page after deletion
        await expect(page).toHaveURL(/\/$/)
        
        // Verify article is no longer in the feed
        await expect(page.getByRole('heading', { name: articleTitle })).not.toBeVisible()
    })

    test('Create article, navigate via username, and delete', async ({ page, config }) => {
        // Generate random article data
        const articleTitle = faker.lorem.sentence(5)
        const articleDescription = faker.lorem.sentences(2)
        const articleBody = faker.lorem.paragraphs(3)
        const articleTags = faker.lorem.word()
        
        // Navigate to the application and sign in
        await page.goto(config.uiUrl)
        await page.getByRole('link', { name: 'Sign in' }).click()
        await page.getByPlaceholder('Email').fill(config.userEmail)
        await page.getByPlaceholder('Password').fill(config.userPassword)
        await page.getByRole('button', { name: 'Sign in' }).click()
        
        // Wait for successful login
        await page.waitForURL(/^((?!login).)*$/)
        
        // Navigate to New Article page
        await page.getByRole('link', { name: 'New Article' }).click()
        
        // Fill in article form
        await page.getByPlaceholder('Article Title').fill(articleTitle)
        await page.getByPlaceholder('What\'s this article about?').fill(articleDescription)
        await page.getByPlaceholder('Write your article (in markdown)').fill(articleBody)
        await page.getByPlaceholder('Enter tags').fill(articleTags)
        
        // Publish article
        await page.getByRole('button', { name: 'Publish Article' }).click()
        
        // Wait for article page to load
        await page.waitForURL(/.*article\/.*/)
        await expect(page.locator('h1').first()).toContainText(articleTitle)
        
        // Click on username in navigation to go to profile
        await page.locator('.navbar .nav-link').last().click()
        
        // Verify we're on the profile page
        await expect(page).toHaveURL(/.*profile\/.*/)
        
        // Find and click on the created article from profile
        await page.getByRole('heading', { name: articleTitle }).click()
        
        // Verify we're on the article page
        await page.waitForURL(/.*article\/.*/)
        
        // Delete the article
        await page.getByRole('button', { name: 'Delete Article' }).first().click()
        
        // Verify we're redirected to home page after deletion
        await expect(page).toHaveURL(/\/$/)
    })

    test('Create article, update it, and delete', async ({ page, config }) => {
        // Generate initial article data
        const originalTitle = faker.lorem.sentence(5)
        const originalDescription = faker.lorem.sentences(2)
        const originalBody = faker.lorem.paragraphs(3)
        const originalTags = faker.lorem.word()
        
        // Generate updated article data
        const updatedTitle = faker.lorem.sentence(5)
        const updatedDescription = faker.lorem.sentences(2)
        const updatedBody = faker.lorem.paragraphs(3)
        const updatedTags = faker.lorem.word()
        
        // Navigate to the application and sign in
        await page.goto(config.uiUrl)
        await page.getByRole('link', { name: 'Sign in' }).click()
        await page.getByPlaceholder('Email').fill(config.userEmail)
        await page.getByPlaceholder('Password').fill(config.userPassword)
        await page.getByRole('button', { name: 'Sign in' }).click()
        
        // Wait for successful login
        await page.waitForURL(/^((?!login).)*$/)
        
        // Navigate to New Article page
        await page.getByRole('link', { name: 'New Article' }).click()
        await expect(page).toHaveURL(/.*editor/)
        
        // Fill in article form with original data
        await page.getByPlaceholder('Article Title').fill(originalTitle)
        await page.getByPlaceholder('What\'s this article about?').fill(originalDescription)
        await page.getByPlaceholder('Write your article (in markdown)').fill(originalBody)
        await page.getByPlaceholder('Enter tags').fill(originalTags)
        
        // Publish article
        await page.getByRole('button', { name: 'Publish Article' }).click()
        
        // Verify article was created
        await page.waitForURL(/.*article\/.*/)
        await expect(page.locator('h1').first()).toContainText(originalTitle)
        await expect(page.locator('.article-content')).toContainText(originalBody)
        
        // Click Edit Article button (use first() since there are two on the page)
        await page.getByRole('link', { name: 'Edit Article' }).first().click()
        
        // Verify we're on the editor page
        await expect(page).toHaveURL(/.*editor\/.*/)
        
        // Wait for form to be ready
        await page.getByPlaceholder('Article Title').waitFor({ state: 'visible' })
        
        // Clear existing fields and fill in updated data
        await page.getByPlaceholder('Article Title').fill('')
        await page.getByPlaceholder('Article Title').fill(updatedTitle)
        
        await page.getByPlaceholder('What\'s this article about?').fill('')
        await page.getByPlaceholder('What\'s this article about?').fill(updatedDescription)
        
        await page.getByPlaceholder('Write your article (in markdown)').fill('')
        await page.getByPlaceholder('Write your article (in markdown)').fill(updatedBody)
        
        // Handle tags - remove existing tags if present
        const tagRemoveButtons = page.locator('.tag-list .ion-close-round')
        const tagCount = await tagRemoveButtons.count()
        for (let i = 0; i < tagCount; i++) {
            await tagRemoveButtons.first().click()
            await page.waitForTimeout(100)
        }
        
        await page.getByPlaceholder('Enter tags').fill(updatedTags)
        await page.keyboard.press('Enter')
        
        // Publish updated article
        await page.getByRole('button', { name: 'Publish Article' }).click()
        
        // Verify article was updated
        await page.waitForURL(/.*article\/.*/)
        await expect(page.locator('h1').first()).toContainText(updatedTitle)
        await expect(page.locator('.article-content')).toContainText(updatedBody)
        
        // Verify original content is no longer present
        await expect(page.locator('.article-content')).not.toContainText(originalBody)
        
        // Delete the article
        await page.getByRole('button', { name: 'Delete Article' }).first().click()
        
        // Verify we're redirected to home page after deletion
        await expect(page).toHaveURL(/\/$/)
        
        // Verify updated article is no longer in the feed
        await expect(page.getByRole('heading', { name: updatedTitle })).not.toBeVisible()
    })

    test('Sign in fails with invalid credentials', async ({ page, config }) => {
        // Navigate to the application
        await page.goto(config.uiUrl)
        
        // Click on "Sign in" link
        await page.getByRole('link', { name: 'Sign in' }).click()
        
        // Fill in invalid credentials
        await page.getByPlaceholder('Email').fill('invalid@test.com')
        await page.getByPlaceholder('Password').fill('wrongpassword')
        
        // Click Sign in button
        await page.getByRole('button', { name: 'Sign in' }).click()
        
        // Verify error message is displayed
        await expect(page.locator('.error-messages')).toBeVisible()
        await expect(page.locator('.error-messages')).toContainText('email or password is invalid')
        
        // Verify we're still on login page
        await expect(page).toHaveURL(/.*login/)
    })
})