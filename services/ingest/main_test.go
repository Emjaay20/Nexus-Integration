package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNormalizeMpn(t *testing.T) {
	cases := map[string]string{
		"STM32F401RET6-TR":  "STM32F401RET6",
		"lm1117-3.3/nopb":   "LM1117-3.3",
		"RC0603FR-0710KL-ND": "RC0603FR-0710KL",
	}
	for input, want := range cases {
		if got := NormalizeMpn(input); got != want {
			t.Fatalf("NormalizeMpn(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestEnrichBatchConcurrentPool(t *testing.T) {
	srv := NewIngestServer()
	resp := srv.EnrichBatch(context.Background(), []string{
		"STM32F401RET6-TR",
		"LM1117-3.3",
		"RC0603FR-0710KL",
		"OPA2350UA",
	}, 1000)

	if resp.TotalPartsQueried != 4 {
		t.Fatalf("expected 4 results, got %d", resp.TotalPartsQueried)
	}
	if resp.Results[0].NormalizedMpn != "STM32F401RET6" {
		t.Fatalf("unexpected normalized MPN: %s", resp.Results[0].NormalizedMpn)
	}
	if resp.Results[0].DistributorCount < 2 {
		t.Fatalf("expected multiple distributor offers for STM32F401RET6, got %d", resp.Results[0].DistributorCount)
	}
	if resp.Results[3].LifecycleStatus != "NRND" {
		t.Fatalf("expected NRND for OPA2350UA, got %s", resp.Results[3].LifecycleStatus)
	}
}

func TestHttpEnrichEndpoint(t *testing.T) {
	srv := NewIngestServer()
	ts := httptest.NewServer(srv.Routes())
	defer ts.Close()

	body, _ := json.Marshal(EnrichBatchRequest{
		Mpns:            []string{"STM32F401RET6", "GD32F405RGT6"},
		TargetBatchSize: 100,
	})
	res, err := http.Post(ts.URL+"/api/v1/ingest/enrich-batch", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("http post failed: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("unexpected status: %d", res.StatusCode)
	}
	var parsed EnrichBatchResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if len(parsed.Results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(parsed.Results))
	}
}
