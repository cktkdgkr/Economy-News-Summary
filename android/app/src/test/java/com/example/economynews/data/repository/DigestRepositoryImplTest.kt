package com.example.economynews.data.repository

import com.example.economynews.data.local.DigestDao
import com.example.economynews.data.local.DigestEntity
import com.example.economynews.data.local.DigestItemEntity
import com.example.economynews.data.local.DigestWithItems
import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.model.DigestItem
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class DigestRepositoryImplTest {

    private lateinit var fakeDao: FakeDigestDao
    private lateinit var repository: DigestRepositoryImpl

    @Before
    fun setUp() {
        fakeDao = FakeDigestDao()
        repository = DigestRepositoryImpl(fakeDao)
    }

    @Test
    fun `purgeOlderThan 30일은 30일 이전 cutoff를 deleteOlderThan에 전달한다`() = runBlocking {
        repository.purgeOlderThan(30)

        val expected = LocalDate.now(ZoneId.of("Asia/Seoul"))
            .minusDays(30L)
            .format(DateTimeFormatter.ISO_LOCAL_DATE)
        assertEquals(expected, fakeDao.lastDeleteOlderThanCutoff)
    }

    @Test
    fun `purgeOlderThan 1일은 어제 날짜를 cutoff로 사용한다`() = runBlocking {
        repository.purgeOlderThan(1)

        val expected = LocalDate.now(ZoneId.of("Asia/Seoul"))
            .minusDays(1L)
            .format(DateTimeFormatter.ISO_LOCAL_DATE)
        assertEquals(expected, fakeDao.lastDeleteOlderThanCutoff)
    }

    @Test
    fun `upsert는 digest와 items를 DAO에 전달한다`() = runBlocking {
        val digest = DailyDigest(
            dateKst = "2026-05-22",
            headline = "헤드라인",
            items = listOf(
                DigestItem(source = "연합뉴스", title = "제목", shortSummary = "요약", link = "https://a.com")
            ),
            articleCount = 1,
            createdAt = "2026-05-22T00:00:00Z",
        )

        repository.upsert(digest)

        assertNotNull(fakeDao.upsertedDigest)
        assertEquals("2026-05-22", fakeDao.upsertedDigest!!.dateKst)
        assertEquals(1, fakeDao.upsertedItems.size)
        assertEquals("2026-05-22", fakeDao.upsertedItems[0].digestDateKst)
        assertEquals("연합뉴스", fakeDao.upsertedItems[0].source)
    }

    @Test
    fun `upsert with empty items calls DAO with empty list`() = runBlocking {
        val digest = DailyDigest(
            dateKst = "2026-05-21",
            headline = "헤드라인",
            items = emptyList(),
            articleCount = 0,
            createdAt = "2026-05-21T00:00:00Z",
        )

        repository.upsert(digest)

        assertNotNull(fakeDao.upsertedDigest)
        assertTrue(fakeDao.upsertedItems.isEmpty())
    }

    // --- Fake DAO ---

    private class FakeDigestDao : DigestDao {
        var lastDeleteOlderThanCutoff: String? = null
        var upsertedDigest: DigestEntity? = null
        var upsertedItems: List<DigestItemEntity> = emptyList()

        override fun observeLatest(): Flow<DigestWithItems?> = emptyFlow()

        override suspend fun getByDate(dateKst: String): DigestWithItems? = null

        override suspend fun insertDigest(digest: DigestEntity) {
            upsertedDigest = digest
        }

        override suspend fun insertItems(items: List<DigestItemEntity>) {
            upsertedItems = items
        }

        override suspend fun deleteItemsByDate(dateKst: String) {}

        override suspend fun deleteOlderThan(cutoffDate: String) {
            lastDeleteOlderThanCutoff = cutoffDate
        }

        override suspend fun upsert(digest: DigestEntity, items: List<DigestItemEntity>) {
            deleteItemsByDate(digest.dateKst)
            insertDigest(digest)
            insertItems(items)
        }
    }
}
