package com.example.economynews.domain.usecase

import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.port.DigestRepository
import com.example.economynews.domain.port.NotificationPort
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class IngestDigestUseCaseTest {

    private lateinit var fakeRepository: FakeDigestRepository
    private lateinit var fakeNotification: FakeNotificationPort
    private lateinit var useCase: IngestDigestUseCase

    @Before
    fun setUp() {
        fakeRepository = FakeDigestRepository()
        fakeNotification = FakeNotificationPort()
        useCase = IngestDigestUseCase(fakeRepository, fakeNotification)
    }

    @Test
    fun `정상 payload는 DailyDigest를 생성하고 upsert와 notification을 호출한다`() = runBlocking {
        val itemsJson = """[{"source":"연합뉴스","title":"제목1","shortSummary":"요약1","link":"https://a.com"}]"""
        val payload = mapOf(
            "date_kst" to "2026-05-22",
            "headline" to "경제 헤드라인 요약",
            "total_count" to "10",
            "items_json" to itemsJson,
            "created_at" to "2026-05-22T00:00:00Z",
        )

        val result = useCase(payload)

        assertTrue(result.isSuccess)
        val digest = result.getOrThrow()
        assertEquals("2026-05-22", digest.dateKst)
        assertEquals("경제 헤드라인 요약", digest.headline)
        assertEquals(10, digest.articleCount)
        assertEquals(1, digest.items.size)
        assertEquals("연합뉴스", digest.items[0].source)
        assertNotNull(fakeRepository.upsertedDigest)
        assertTrue(fakeNotification.notified)
    }

    @Test
    fun `date_kst 누락 시 Result_failure를 반환한다`() = runBlocking {
        val payload = mapOf(
            "headline" to "헤드라인",
        )

        val result = useCase(payload)

        assertTrue(result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertTrue(exception!!.message!!.contains("date_kst missing"))
    }

    @Test
    fun `items_json이 빈 문자열이면 items는 빈 리스트다`() = runBlocking {
        val payload = mapOf(
            "date_kst" to "2026-05-22",
            "headline" to "헤드라인",
            "items_json" to "",
        )

        val result = useCase(payload)

        assertTrue(result.isSuccess)
        val digest = result.getOrThrow()
        assertTrue(digest.items.isEmpty())
    }

    // --- Fakes ---

    private class FakeDigestRepository : DigestRepository {
        var upsertedDigest: DailyDigest? = null

        override fun observeLatest(): Flow<DailyDigest?> = emptyFlow()
        override suspend fun getByDate(dateKst: String): DailyDigest? = null
        override suspend fun upsert(digest: DailyDigest) { upsertedDigest = digest }
        override suspend fun purgeOlderThan(days: Int) {}
    }

    private class FakeNotificationPort : NotificationPort {
        var notified = false

        override suspend fun showDigestNotification(digest: DailyDigest) { notified = true }
    }
}
