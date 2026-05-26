package com.example.economynews.domain.model

data class DigestItem(
    val source: String,        // 언론사명
    val title: String,         // 기사 제목
    val shortSummary: String,  // ≤60자 짧은 요약
    val link: String,          // 원문 URL
)
