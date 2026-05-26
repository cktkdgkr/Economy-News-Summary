package com.example.economynews.domain.text

object SummaryLengthEnforcer {

    fun enforce(
        text: String,
        min: Int = 80,
        max: Int = 120,
    ): String {
        val cleaned = text.replace("\n", "").replace("\r", "")
        val codePoints = cleaned.codePointCount(0, cleaned.length)

        if (codePoints <= max) {
            if (codePoints < min) {
                System.err.println("SummaryLengthEnforcer: Summary too short: $codePoints < $min")
            }
            return cleaned
        }

        // "…" 1자 예약하여 max - 1 코드포인트까지 잘라낸 뒤 어절 경계(마지막 공백) 우선 적용
        val truncTarget = max - 1
        val offsetAtTarget = cleaned.offsetByCodePoints(0, truncTarget)
        val truncated = cleaned.substring(0, offsetAtTarget)

        val lastSpace = truncated.lastIndexOf(' ')
        val result = if (lastSpace > 0) {
            truncated.substring(0, lastSpace)
        } else {
            truncated
        }

        return result + "…"
    }
}
