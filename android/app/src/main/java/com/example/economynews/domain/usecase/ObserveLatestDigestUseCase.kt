package com.example.economynews.domain.usecase

import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.port.DigestRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class ObserveLatestDigestUseCase @Inject constructor(
    private val repository: DigestRepository,
) {
    operator fun invoke(): Flow<DailyDigest?> = repository.observeLatest()
}
