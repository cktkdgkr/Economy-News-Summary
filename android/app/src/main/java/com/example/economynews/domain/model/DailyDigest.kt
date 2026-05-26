package com.example.economynews.domain.model

data class DailyDigest(
    val dateKst: String,       // "2026-05-22"
    val headline: String,      // 80~120자 통합 헤드라인
    val items: List<DigestItem>,
    val articleCount: Int,
    val createdAt: String,     // ISO 8601 UTC
)
