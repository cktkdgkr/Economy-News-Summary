package com.example.economynews.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "digests")
data class DigestEntity(
    @PrimaryKey val dateKst: String,
    val headline: String,
    val articleCount: Int,
    val createdAt: String,
)
