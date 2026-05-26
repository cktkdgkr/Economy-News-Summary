package com.example.economynews.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.usecase.ObserveLatestDigestUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data object Empty : HomeUiState
    data class Success(val digest: DailyDigest) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    observeLatestDigest: ObserveLatestDigestUseCase,
) : ViewModel() {

    val uiState: StateFlow<HomeUiState> = observeLatestDigest()
        .map { digest ->
            if (digest != null) HomeUiState.Success(digest)
            else HomeUiState.Empty
        }
        .catch { e -> emit(HomeUiState.Error(e.message ?: "오류가 발생했습니다")) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState.Loading)
}
