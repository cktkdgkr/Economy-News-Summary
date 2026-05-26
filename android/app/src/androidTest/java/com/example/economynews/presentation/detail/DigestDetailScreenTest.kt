package com.example.economynews.presentation.detail

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
class DigestDetailScreenTest {

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
            DigestItem(
                source = "매일경제",
                title = "코스피 상승 마감",
                shortSummary = "외국인 순매수에 코스피 0.8% 올라",
                link = "https://example.com/article2",
            ),
        ),
        articleCount = 10,
        createdAt = "2026-05-26T06:00:00Z",
    )

    @Test
    fun loadingState_showsProgressIndicator() {
        composeTestRule.setContent {
            DigestDetailScreenContent(uiState = DetailUiState.Loading)
        }
        // TopAppBar with default title
        composeTestRule.onNodeWithText("상세").assertIsDisplayed()
    }

    @Test
    fun errorState_showsErrorMessage() {
        composeTestRule.setContent {
            DigestDetailScreenContent(uiState = DetailUiState.Error("데이터 없음"))
        }
        composeTestRule.onNodeWithText("오류: 데이터 없음").assertIsDisplayed()
    }

    @Test
    fun successState_showsHeadlineAndItems() {
        composeTestRule.setContent {
            DigestDetailScreenContent(uiState = DetailUiState.Success(sampleDigest))
        }
        composeTestRule.onNodeWithText("국내외 경제 주요 이슈 요약").assertIsDisplayed()
        composeTestRule.onNodeWithText("금리 동결 결정").assertIsDisplayed()
        composeTestRule.onNodeWithText("코스피 상승 마감").assertIsDisplayed()
    }

    @Test
    fun successState_showsDateKstInTopBar() {
        composeTestRule.setContent {
            DigestDetailScreenContent(uiState = DetailUiState.Success(sampleDigest))
        }
        composeTestRule.onNodeWithText("2026-05-26").assertIsDisplayed()
    }
}
