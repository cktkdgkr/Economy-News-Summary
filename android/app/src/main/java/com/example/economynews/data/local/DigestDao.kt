package com.example.economynews.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface DigestDao {

    @Transaction
    @Query("SELECT * FROM digests ORDER BY dateKst DESC LIMIT 1")
    fun observeLatest(): Flow<DigestWithItems?>

    @Transaction
    @Query("SELECT * FROM digests WHERE dateKst = :dateKst")
    suspend fun getByDate(dateKst: String): DigestWithItems?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDigest(digest: DigestEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<DigestItemEntity>)

    @Query("DELETE FROM digest_items WHERE digestDateKst = :dateKst")
    suspend fun deleteItemsByDate(dateKst: String)

    @Query("DELETE FROM digests WHERE dateKst < :cutoffDate")
    suspend fun deleteOlderThan(cutoffDate: String)

    @Transaction
    suspend fun upsert(digest: DigestEntity, items: List<DigestItemEntity>) {
        deleteItemsByDate(digest.dateKst)
        insertDigest(digest)
        insertItems(items)
    }
}
