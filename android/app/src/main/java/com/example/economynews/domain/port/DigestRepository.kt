package com.example.economynews.domain.port

import com.example.economynews.domain.model.DailyDigest
import kotlinx.coroutines.flow.Flow

interface DigestRepository {
    fun observeLatest(): Flow<DailyDigest?>
    suspend fun getByDate(dateKst: String): DailyDigest?
    suspend fun upsert(digest: DailyDigest)
    suspend fun purgeOlderThan(days: Int)
}
