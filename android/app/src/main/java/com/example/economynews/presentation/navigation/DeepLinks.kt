package com.example.economynews.presentation.navigation

object DeepLinks {
    const val SCHEME = "economynews"
    const val HOST_DIGEST = "digest"

    fun digestUri(dateKst: String): String = "$SCHEME://$HOST_DIGEST/$dateKst"
}
