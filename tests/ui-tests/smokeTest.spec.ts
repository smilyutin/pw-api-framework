import { test } from '../../utils/fixtures'
import { expect } from '../../utils/custom-expect'

import { signIn, createArticle, updateArticle } from '../../helpers/ui-helpers'

test.describe('UI Smoke Tests - Authentication and Article Management', () => {
    test('User can sign in successfully', async ({ page, config }) => {
        // Use helper function to sign in
        await signIn(page, { email: config.userEmail, password: config.userPassword }, config.uiUrl)
        
        // Verify user is logged in by checking for user-specific navigation elements
        await expect(page.getByRole('link', { name: 'New Article' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
        
        // Verify we're redirected to home page
        await expect(page).toHaveURL(/\/$/)
    })

    test('Create new article and delete it from home', async ({ page, config }) => {
        // Sign in
        await signIn(page, { email: config.userEmail, password: config.userPassword }, config.uiUrl)
        
        // Create article
        const article = await createArticle(page)
        
        // Verify article was created and we're on the article page
        const articlePage = page.locator('.article-page')
        await expect(articlePage.locator('h1').first()).toContainText(article.title)
        
        // Verify article content is displayed
        await expect(articlePage.locator('.article-content')).toContainText(article.body)
        
        // Click on home to see the article in the feed
        await page.getByRole('link', { name: 'Home' }).first().click()
        await expect(page).toHaveURL(/\/$/)
        
        // Verify article appears in the feed
        await expect(page.getByRole('heading', { name: article.title })).toBeVisible()
        
        // Click on the article to open it
        await page.getByRole('heading', { name: article.title }).click()
        
        // Delete the article
        await page.getByRole('button', { name: 'Delete Article' }).first().click()
        
        // Verify we're redirected to home page after deletion
        await expect(page).toHaveURL(/\/$/)
        
        // Verify article is no longer in the feed
        await expect(page.getByRole('heading', { name: article.title })).not.toBeVisible()
    })

    test('Create article, navigate via username, and delete', async ({ page, config }) => {
        // Sign in
        await signIn(page, { email: config.userEmail, password: config.userPassword }, config.uiUrl)
        
        // Create article
        const article = await createArticle(page)
        
        // Verify article was created
        await expect(page.locator('h1').first()).toContainText(article.title)
        
        // Click on username in navigation to go to profile
        const navbar = page.locator('.navbar')
        await navbar.locator('.nav-link').last().click()
        
        // Verify we're on the profile page
        await expect(page).toHaveURL(/.*profile\/.*/)
        
        // Find and click on the created article from profile
        await page.getByRole('heading', { name: article.title }).click()
        
        // Verify we're on the article page
        await page.waitForURL(/.*article\/.*/)
        
        // Delete the article
        await page.getByRole('button', { name: 'Delete Article' }).first().click()
        
        // Verify we're redirected to home page after deletion
        await expect(page).toHaveURL(/\/$/)
    })

    test('Create article, update it, and delete', async ({ page, config }) => {
        // Sign in
        await signIn(page, { email: config.userEmail, password: config.userPassword }, config.uiUrl)
        
        // Create article
        const originalArticle = await createArticle(page)
        
        // Verify article was created
        const articlePage = page.locator('.article-page')
        await expect(articlePage.locator('h1').first()).toContainText(originalArticle.title)
        await expect(articlePage.locator('.article-content')).toContainText(originalArticle.body)
        
        // Update the article using helper
        const updatedArticle = await updateArticle(page, {})
        
        // Verify article was updated
        await expect(articlePage.locator('h1').first()).toContainText(updatedArticle.title)
        await expect(articlePage.locator('.article-content')).toContainText(updatedArticle.body)
        
        // Verify original content is no longer present
        await expect(articlePage.locator('.article-content')).not.toContainText(originalArticle.body)
        
        // Delete the article
        await page.getByRole('button', { name: 'Delete Article' }).first().click()
        
        // Verify we're redirected to home page after deletion
        await expect(page).toHaveURL(/\/$/)
        
        // Verify updated article is no longer in the feed
        await expect(page.getByRole('heading', { name: updatedArticle.title })).not.toBeVisible()
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
        console.log(await page.locator('.error-messages').innerText())
        
        // Verify we're still on login page
        await expect(page).toHaveURL(/.*login/)
    })
})