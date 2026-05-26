package com.example.economynews.platform.di

import com.example.economynews.domain.port.NotificationPort
import com.example.economynews.platform.notification.DailyDigestNotifier
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class NotificationModule {
    @Binds
    abstract fun bindNotificationPort(impl: DailyDigestNotifier): NotificationPort
}
