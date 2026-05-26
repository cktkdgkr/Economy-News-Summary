package com.example.economynews.data.repository

import com.example.economynews.data.local.DigestDao
import com.example.economynews.data.local.toDomain
import com.example.economynews.data.local.toEntity
import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.port.DigestRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

class DigestRepositoryImpl @Inject constructor(
    private val dao: DigestDao,
) : DigestRepository {

    override fun observeLatest(): Flow<DailyDigest?> =
        dao.observeLatest().map { it?.toDomain() }

    override suspend fun getByDate(dateKst: String): DailyDigest? =
        dao.getByDate(dateKst)?.toDomain()

    override suspend fun upsert(digest: DailyDigest) {
        val entity = digest.toEntity()
        val items = digest.items.map { it.toEntity(digest.dateKst) }
        dao.upsert(entity, items)
    }

    override suspend fun purgeOlderThan(days: Int) {
        val cutoff = LocalDate.now()
            .minusDays(days.toLong())
            .format(DateTimeFormatter.ISO_LOCAL_DATE)
        dao.deleteOlderThan(cutoff)
    }
}
