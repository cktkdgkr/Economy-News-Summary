package com.example.economynews.domain.port

import com.example.economynews.domain.model.DailyDigest

interface DigestFetchPort {
    suspend fun fetchLatest(): DailyDigest
    suspend fun fetchByDate(dateKst: String): DailyDigest
}
