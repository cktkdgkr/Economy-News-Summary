package com.example.economynews.data.di

import android.content.Context
import androidx.room.Room
import com.example.economynews.data.local.AppDatabase
import com.example.economynews.data.local.DigestDao
import com.example.economynews.data.repository.DigestRepositoryImpl
import com.example.economynews.domain.port.DigestRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "economy_news.db")
            .build()

    @Provides
    fun provideDigestDao(db: AppDatabase): DigestDao = db.digestDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindDigestRepository(impl: DigestRepositoryImpl): DigestRepository
}
