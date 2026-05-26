package com.example.economynews.platform.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

object NotificationChannels {
    const val DAILY_DIGEST = "daily_digest"

    fun create(context: Context) {
        val channel = NotificationChannel(
            DAILY_DIGEST,
            "오늘의 경제 뉴스",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "매일 아침 경제 뉴스 요약 알림"
        }
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(channel)
    }
}
