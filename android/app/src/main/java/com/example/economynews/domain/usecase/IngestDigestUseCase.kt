package com.example.economynews.domain.usecase

import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.model.DigestItem
import com.example.economynews.domain.port.DigestRepository
import com.example.economynews.domain.port.NotificationPort
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject

class IngestDigestUseCase @Inject constructor(
    private val repository: DigestRepository,
    private val notificationPort: NotificationPort,
) {
    suspend operator fun invoke(payload: Map<String, String>): Result<DailyDigest> {
        return runCatching {
            val digest = parsePayload(payload)
            repository.upsert(digest)
            notificationPort.showDigestNotification(digest)
            digest
        }
    }

    private fun parsePayload(payload: Map<String, String>): DailyDigest {
        val dateKst = requireNotNull(payload["date_kst"]) { "date_kst missing" }
        val headline = requireNotNull(payload["headline"]) { "headline missing" }
        val totalCount = payload["total_count"]?.toIntOrNull() ?: 0
        val itemsJson = payload["items_json"]
        val items = if (itemsJson.isNullOrBlank()) {
            emptyList()
        } else {
            parseItems(itemsJson)
        }
        val createdAt = payload["created_at"] ?: ""
        return DailyDigest(
            dateKst = dateKst,
            headline = headline,
            items = items,
            articleCount = totalCount,
            createdAt = createdAt,
        )
    }

    private fun parseItems(json: String): List<DigestItem> {
        val arr = Json.parseToJsonElement(json) as JsonArray
        return arr.map { element ->
            val obj = element.jsonObject
            DigestItem(
                source = obj["source"]?.jsonPrimitive?.content ?: "",
                title = obj["title"]?.jsonPrimitive?.content ?: "",
                shortSummary = obj["shortSummary"]?.jsonPrimitive?.content ?: "",
                link = obj["link"]?.jsonPrimitive?.content ?: "",
            )
        }
    }
}
