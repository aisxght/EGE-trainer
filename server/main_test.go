package main

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestWordsEndpoint(t *testing.T) {
	h := newHandler("../dist")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/words", nil))
	if w.Code != 200 { t.Fatalf("status = %d", w.Code) }
	var data struct { Words []struct { Word string `json:"word"` } `json:"words"`; TotalRows int `json:"totalRows"` }
	if err := json.Unmarshal(w.Body.Bytes(), &data); err != nil { t.Fatal(err) }
	if len(data.Words) != 209 || data.TotalRows != 720 { t.Fatalf("unexpected dataset: %d words, %d rows", len(data.Words), data.TotalRows) }
	foundCorrected := false
	for _, word := range data.Words {
		if word.Word == "запломбировать" { foundCorrected = true }
	}
	if !foundCorrected { t.Fatal("user-confirmed correction missing from quiz dataset") }
}

func TestUnknownApiAndMethod(t *testing.T) {
	h := newHandler("../dist")
	for _, tc := range []struct { method, path string; want int } { {"GET", "/api/unknown", 404}, {"POST", "/api/words", 405}, {"GET", "/api/health", 200} } {
		w := httptest.NewRecorder(); h.ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
		if w.Code != tc.want { t.Errorf("%s %s = %d, want %d", tc.method, tc.path, w.Code, tc.want) }
	}
}
