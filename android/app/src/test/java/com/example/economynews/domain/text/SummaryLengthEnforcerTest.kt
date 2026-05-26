package com.example.economynews.domain.text

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SummaryLengthEnforcerTest {

    // 80~120 코드포인트 범위 텍스트 생성 헬퍼 (한글 1자 = 1 코드포인트)
    private fun koreanString(codePointCount: Int): String = "가".repeat(codePointCount)

    private fun codePointLen(s: String) = s.codePointCount(0, s.length)

    // 1. 정상 범위 (80~120 코드포인트) → 그대로 반환
    @Test
    fun `정상 범위 80코드포인트 텍스트는 그대로 반환된다`() {
        val input = koreanString(80)
        val result = SummaryLengthEnforcer.enforce(input)
        assertEquals(input, result)
        assertEquals(80, codePointLen(result))
    }

    @Test
    fun `정상 범위 120코드포인트 텍스트는 그대로 반환된다`() {
        val input = koreanString(120)
        val result = SummaryLengthEnforcer.enforce(input)
        assertEquals(input, result)
        assertEquals(120, codePointLen(result))
    }

    // 2. 120 초과 → 어절 경계 잘라내기 + "…"
    @Test
    fun `121코드포인트 텍스트는 max 이내로 잘려 말줄임표가 붙는다`() {
        val input = koreanString(121)
        val result = SummaryLengthEnforcer.enforce(input)
        assertTrue(result.endsWith("…"))
        assertTrue(codePointLen(result) <= 120)
    }

    @Test
    fun `공백이 있는 긴 텍스트는 어절 경계에서 잘린다`() {
        // 50자 + 공백 + 80자 = 131 코드포인트, max=120 초과
        val input = koreanString(50) + " " + koreanString(80)
        val result = SummaryLengthEnforcer.enforce(input)
        assertTrue(result.endsWith("…"))
        assertTrue(codePointLen(result) <= 120)
        // 어절 경계이므로 공백 위치에서 잘려야 함: 50자 부분 + "…" = 51 코드포인트
        val withoutEllipsis = result.dropLast(1) // "…" 제거
        // 잘린 위치가 공백 바로 앞이므로 공백이 없어야 한다
        assertTrue(!withoutEllipsis.endsWith(" "))
    }

    // 3. 80 미만 → 그대로 반환 (경고 로그, 반환값 변경 없음)
    @Test
    fun `79코드포인트 텍스트는 그대로 반환된다`() {
        val input = koreanString(79)
        val result = SummaryLengthEnforcer.enforce(input)
        assertEquals(input, result)
    }

    @Test
    fun `빈 문자열은 그대로 반환된다`() {
        val result = SummaryLengthEnforcer.enforce("")
        assertEquals("", result)
    }

    // 4. 줄바꿈 포함 → 제거 후 반환
    @Test
    fun `줄바꿈이 포함된 텍스트는 줄바꿈이 제거되어 반환된다`() {
        val input = "안녕하세요\n경제뉴스\r입니다"
        val result = SummaryLengthEnforcer.enforce(input)
        assertTrue(!result.contains('\n'))
        assertTrue(!result.contains('\r'))
        assertEquals("안녕하세요경제뉴스입니다", result)
    }

    // 5. 이모지 포함 → 코드포인트 정확 계산 (이모지는 서로게이트 페어: char 2개, codePoint 1개)
    @Test
    fun `이모지가 포함된 텍스트의 코드포인트를 정확히 계산한다`() {
        // "😀" = 1 코드포인트, 2 char
        // 이모지 10개 + 한글 110개 = 120 코드포인트 → 그대로 반환
        val emoji = "😀".repeat(10)
        val korean = koreanString(110)
        val input = emoji + korean
        assertEquals(20 + 110, input.length) // char 기준: 이모지 20 + 한글 110
        assertEquals(120, codePointLen(input)) // 코드포인트 기준: 10 + 110
        val result = SummaryLengthEnforcer.enforce(input)
        assertEquals(input, result)
    }

    @Test
    fun `이모지 포함 121코드포인트 텍스트는 말줄임표로 잘린다`() {
        // 이모지 1개(1 cp) + 한글 120개(120 cp) = 121 코드포인트
        val input = "😀" + koreanString(120)
        assertEquals(121, codePointLen(input))
        val result = SummaryLengthEnforcer.enforce(input)
        assertTrue(result.endsWith("…"))
        assertTrue(codePointLen(result) <= 120)
    }

    // 6. 한자 혼용 (80~120 범위) → 정상 반환
    @Test
    fun `한자 혼용 텍스트가 정상 범위일 때 그대로 반환된다`() {
        // 한자 1자 = 1 코드포인트
        val input = "美연준 기준금리 동결 결정" + "漢".repeat(67) // 총 81 코드포인트 이상
        val cp = codePointLen(input)
        assertTrue(cp in 80..120)
        val result = SummaryLengthEnforcer.enforce(input)
        assertEquals(input, result)
    }

    // 7. 공백만 있는 문자열 → 그대로 반환 (80 미만)
    @Test
    fun `공백만 있는 문자열은 그대로 반환된다`() {
        val input = "   "
        val result = SummaryLengthEnforcer.enforce(input)
        assertEquals(input, result)
    }

    // 8. 어절 경계 없는 긴 문자열 → 강제 잘라내기 + "…"
    @Test
    fun `공백 없이 121코드포인트인 문자열은 강제로 잘려 말줄임표가 붙는다`() {
        val input = koreanString(121) // 공백 없음
        val result = SummaryLengthEnforcer.enforce(input)
        assertTrue(result.endsWith("…"))
        // 강제 잘라내기: 119 코드포인트 + "…" 1 코드포인트 = 120
        assertEquals(120, codePointLen(result))
    }
}
