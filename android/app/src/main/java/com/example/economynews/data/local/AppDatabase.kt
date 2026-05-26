package com.example.economynews.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [DigestEntity::class, DigestItemEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun digestDao(): DigestDao
}
