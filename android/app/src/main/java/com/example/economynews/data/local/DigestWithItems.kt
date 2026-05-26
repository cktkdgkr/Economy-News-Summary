package com.example.economynews.data.local

import androidx.room.Embedded
import androidx.room.Relation

data class DigestWithItems(
    @Embedded val digest: DigestEntity,
    @Relation(
        parentColumn = "dateKst",
        entityColumn = "digestDateKst",
    )
    val items: List<DigestItemEntity>,
)
