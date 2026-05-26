package com.example.economynews.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "digest_items",
    foreignKeys = [ForeignKey(
        entity = DigestEntity::class,
        parentColumns = ["dateKst"],
        childColumns = ["digestDateKst"],
        onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index("digestDateKst")],
)
data class DigestItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val digestDateKst: String,
    val source: String,
    val title: String,
    val shortSummary: String,
    val link: String,
)
