import { test } from '../../utils/fixtures'
import { expect } from '../../utils/custom-expect'
import { signIn } from '../../helpers/ui-helpers'
import { config } from '../../api-test.config'

test.describe('User Login', () => {
    test('User can log in via UI', async ({ page }) => {
        // Arrange: credentials and URL from config
        const credentials = { email: config.userEmail, password: config.userPassword }
        const uiUrl = config.uiUrl

        // Act: perform login using POM
        await signIn(page, credentials, uiUrl)

        // Assert: verify login success
        await expect(page.getByRole('link', { name: 'New Article' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
        await expect(page).toHaveURL(/\/$/)
    })
})