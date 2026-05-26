package com.example.economynews.domain.port

import com.example.economynews.domain.model.DailyDigest

interface NotificationPort {
    suspend fun showDigestNotification(digest: DailyDigest)
}
