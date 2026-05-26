package com.example.economynews.data.local

import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.model.DigestItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EntityMappersTest {

    @Test
    fun `DigestWithItems toDomain maps all fields correctly`() {
        val entity = DigestEntity(
            dateKst = "2026-05-22",
            headline = "경제 헤드라인",
            articleCount = 5,
            createdAt = "2026-05-22T00:00:00Z",
        )
        val itemEntity = DigestItemEntity(
            id = 1L,
            digestDateKst = "2026-05-22",
            source = "연합뉴스",
            title = "기사 제목",
            shortSummary = "기사 요약",
            link = "https://example.com",
        )
        val withItems = DigestWithItems(digest = entity, items = listOf(itemEntity))

        val domain = withItems.toDomain()

        assertEquals("2026-05-22", domain.dateKst)
        assertEquals("경제 헤드라인", domain.headline)
        assertEquals(5, domain.articleCount)
        assertEquals("2026-05-22T00:00:00Z", domain.createdAt)
        assertEquals(1, domain.items.size)
        assertEquals("연합뉴스", domain.items[0].source)
        assertEquals("기사 제목", domain.items[0].title)
        assertEquals("기사 요약", domain.items[0].shortSummary)
        assertEquals("https://example.com", domain.items[0].link)
    }

    @Test
    fun `DailyDigest toEntity maps all fields correctly`() {
        val digest = DailyDigest(
            dateKst = "2026-05-22",
            headline = "헤드라인",
            items = emptyList(),
            articleCount = 10,
            createdAt = "2026-05-22T00:00:00Z",
        )

        val entity = digest.toEntity()

        assertEquals("2026-05-22", entity.dateKst)
        assertEquals("헤드라인", entity.headline)
        assertEquals(10, entity.articleCount)
        assertEquals("2026-05-22T00:00:00Z", entity.createdAt)
    }

    @Test
    fun `DigestItem toEntity maps all fields including digestDateKst`() {
        val item = DigestItem(
            source = "조선일보",
            title = "기사 제목",
            shortSummary = "짧은 요약",
            link = "https://chosun.com/article",
        )

        val entity = item.toEntity("2026-05-22")

        assertEquals("2026-05-22", entity.digestDateKst)
        assertEquals("조선일보", entity.source)
        assertEquals("기사 제목", entity.title)
        assertEquals("짧은 요약", entity.shortSummary)
        assertEquals("https://chosun.com/article", entity.link)
        assertEquals(0L, entity.id)
    }

    @Test
    fun `DigestWithItems toDomain with empty items list`() {
        val entity = DigestEntity(
            dateKst = "2026-05-20",
            headline = "빈 헤드라인",
            articleCount = 0,
            createdAt = "2026-05-20T00:00:00Z",
        )
        val withItems = DigestWithItems(digest = entity, items = emptyList())

        val domain = withItems.toDomain()

        assertTrue(domain.items.isEmpty())
        assertEquals(0, domain.articleCount)
    }

    @Test
    fun `DigestItemEntity toDomain maps correctly`() {
        val itemEntity = DigestItemEntity(
            id = 42L,
            digestDateKst = "2026-05-22",
            source = "한국경제",
            title = "제목",
            shortSummary = "요약 내용",
            link = "https://hankyung.com",
        )

        val domain = itemEntity.toDomain()

        assertEquals("한국경제", domain.source)
        assertEquals("제목", domain.title)
        assertEquals("요약 내용", domain.shortSummary)
        assertEquals("https://hankyung.com", domain.link)
    }
}
