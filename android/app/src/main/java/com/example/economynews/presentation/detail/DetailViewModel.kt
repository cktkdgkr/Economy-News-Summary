package com.example.economynews.presentation.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.port.DigestRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface DetailUiState {
    data object Loading : DetailUiState
    data class Success(val digest: DailyDigest) : DetailUiState
    data class Error(val message: String) : DetailUiState
}

@HiltViewModel
class DetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: DigestRepository,
) : ViewModel() {

    private val dateKst: String = savedStateHandle["dateKst"] ?: ""

    private val _uiState = MutableStateFlow<DetailUiState>(DetailUiState.Loading)
    val uiState: StateFlow<DetailUiState> = _uiState.asStateFlow()

    init {
        if (dateKst.isBlank()) {
            _uiState.value = DetailUiState.Error("날짜 인자가 누락되었습니다")
        } else {
            viewModelScope.launch {
                try {
                    val digest = repository.getByDate(dateKst)
                    _uiState.value = if (digest != null) {
                        DetailUiState.Success(digest)
                    } else {
                        DetailUiState.Error("다이제스트를 찾을 수 없습니다")
                    }
                } catch (e: Exception) {
                    _uiState.value = DetailUiState.Error(e.message ?: "오류가 발생했습니다")
                }
            }
        }
    }
}
