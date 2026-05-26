package com.example.economynews.data.local

import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.model.DigestItem

fun DigestWithItems.toDomain(): DailyDigest = DailyDigest(
    dateKst = digest.dateKst,
    headline = digest.headline,
    items = items.map { it.toDomain() },
    articleCount = digest.articleCount,
    createdAt = digest.createdAt,
)

fun DigestItemEntity.toDomain(): DigestItem = DigestItem(
    source = source,
    title = title,
    shortSummary = shortSummary,
    link = link,
)

fun DailyDigest.toEntity(): DigestEntity = DigestEntity(
    dateKst = dateKst,
    headline = headline,
    articleCount = articleCount,
    createdAt = createdAt,
)

fun DigestItem.toEntity(digestDateKst: String): DigestItemEntity = DigestItemEntity(
    digestDateKst = digestDateKst,
    source = source,
    title = title,
    shortSummary = shortSummary,
    link = link,
)
