package com.example.economynews.presentation.home

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.model.DigestItem
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val sampleDigest = DailyDigest(
        dateKst = "2026-05-26",
        headline = "국내외 경제 주요 이슈 요약",
        items = listOf(
            DigestItem(
                source = "한국경제",
                title = "금리 동결 결정",
                shortSummary = "한국은행, 기준금리 3.5% 유지",
                link = "https://example.com/article1",
            ),
        ),
        articleCount = 10,
        createdAt = "2026-05-26T06:00:00Z",
    )

    @Test
    fun loadingState_showsProgressIndicator() {
        composeTestRule.setContent {
            HomeScreenContent(uiState = HomeUiState.Loading)
        }
        composeTestRule.onNodeWithText("오늘의 경제 뉴스").assertIsDisplayed()
    }

    @Test
    fun emptyState_showsEmptyMessage() {
        composeTestRule.setContent {
            HomeScreenContent(uiState = HomeUiState.Empty)
        }
        composeTestRule.onNodeWithText("오늘의 다이제스트가 아직 준비되지 않았습니다.").assertIsDisplayed()
    }

    @Test
    fun errorState_showsErrorMessage() {
        composeTestRule.setContent {
            HomeScreenContent(uiState = HomeUiState.Error("네트워크 오류"))
        }
        composeTestRule.onNodeWithText("오류: 네트워크 오류").assertIsDisplayed()
    }

    @Test
    fun successState_showsHeadlineAndItems() {
        composeTestRule.setContent {
            HomeScreenContent(uiState = HomeUiState.Success(sampleDigest))
        }
        composeTestRule.onNodeWithText("국내외 경제 주요 이슈 요약").assertIsDisplayed()
        composeTestRule.onNodeWithText("금리 동결 결정").assertIsDisplayed()
    }
}
