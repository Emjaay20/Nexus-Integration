package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNormalizeMpn(t *testing.T) {
	cases := map[string]string{
		"STM32F401RET6-TR":   "STM32F401RET6",
		"lm1117-3.3/nopb":    "LM1117-3.3",
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

func TestReferenceDataHasExplicitProvenanceAndNoFetchTime(t *testing.T) {
	s := NewIngestServer()
	s.digikeyClientID = ""
	s.digikeySecret = ""
	s.mouserApiKey = ""
	part := s.enrichSinglePart(context.Background(), "STM32F401RET6", 1000)
	if part.DataSource != "reference" || len(part.Warnings) == 0 {
		t.Fatal("reference provenance missing")
	}
	for _, offer := range part.Offers {
		if offer.FetchedAt != "" || offer.Source != "reference_catalog" {
			t.Fatal("reference offer masquerades as a live quote")
		}
	}
}
func TestUnknownAndPartialPartsDoNotReceiveInventedOffers(t *testing.T) {
	s := NewIngestServer()
	s.digikeyClientID = ""
	s.mouserApiKey = ""
	for _, mpn := range []string{"UNKNOWN-123456", "STM32F401", "STM32F401RET6-FAKE"} {
		part := s.enrichSinglePart(context.Background(), mpn, 100)
		if part.DataSource != "unavailable" || len(part.Offers) != 0 || part.TotalStock != 0 || part.BestUnitPriceAtQty != 0 {
			t.Fatalf("invented offer for %s", mpn)
		}
	}
}

func TestQuantityPricingUnsortedAndBelowMOQ(t *testing.T) {
	breaks := []PriceBreak{{Qty: 1000, UnitPrice: 1}, {Qty: 1, UnitPrice: 3}, {Qty: 100, UnitPrice: 2}}
	if unitPriceForQuantity(breaks, 200) != 2 {
		t.Fatal("wrong tier for unsorted price breaks")
	}
	if unitPriceForQuantity([]PriceBreak{{Qty: 100, UnitPrice: 2}}, 10) != 0 {
		t.Fatal("must not quote below minimum tier")
	}
}

type testTransport func(*http.Request) (*http.Response, error)

func (f testTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestDigiKeyV4UsesVariationPricingAndMOQ(t *testing.T) {
	s := NewIngestServer()
	s.digikeyClientID = "fixture-client"
	s.digikeySecret = "fixture-secret"
	s.mouserApiKey = ""
	s.httpClient = &http.Client{Transport: testTransport(func(r *http.Request) (*http.Response, error) {
		body := `{"access_token":"fixture-token"}`
		if r.URL.Path != "/v1/oauth2/token" {
			body = `{"Product":{"ManufacturerProductNumber":"STM32F401RET6","Manufacturer":{"Name":"ST"},"Description":{"ProductDescription":"MCU"},"ProductStatus":{"Status":"Active"},"ProductVariations":[{"DigiKeyProductNumber":"cut-tape","MinimumOrderQuantity":1,"QuantityAvailableforPackageType":120,"PackageType":{"Name":"Cut Tape"},"StandardPricing":[{"BreakQuantity":1,"UnitPrice":5},{"BreakQuantity":100,"UnitPrice":4}]},{"DigiKeyProductNumber":"reel","MinimumOrderQuantity":1000,"QuantityAvailableforPackageType":5000,"StandardPricing":[{"BreakQuantity":1000,"UnitPrice":3}]}]}}`
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}
	part := s.enrichSinglePart(context.Background(), "STM32F401RET6", 100)
	if part.DataSource != "live" || part.BestUnitPriceAtQty != 4 || part.Offers[0].Sku != "cut-tape" {
		t.Fatalf("incorrect live variation quote: %+v", part)
	}
	if part.Manufacturer != "ST" || part.DistributorCount != 1 || part.Offers[0].FetchedAt == "" {
		t.Fatal("live metadata missing")
	}
}
func TestFailedLiveLookupDoesNotPretendToBeLive(t *testing.T) {
	s := NewIngestServer()
	s.digikeyClientID = "fixture-client"
	s.digikeySecret = "fixture-secret"
	s.mouserApiKey = ""
	s.httpClient = &http.Client{Transport: testTransport(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 401, Body: io.NopCloser(strings.NewReader("unauthorized")), Header: make(http.Header)}, nil
	})}
	part := s.enrichSinglePart(context.Background(), "STM32F401RET6", 100)
	if part.DataSource != "reference" {
		t.Fatal("failed API must not be marked live")
	}
	if !strings.Contains(strings.Join(part.Warnings, " "), "lookup failed") {
		t.Fatal("lookup failure must be visible")
	}
}

func TestNexarGraphQLReturnsLiveMultiSellerOffers(t *testing.T) {
	s := NewIngestServer()
	s.digikeyClientID = ""
	s.digikeySecret = ""
	s.mouserApiKey = ""
	s.nexarClientID = "nexar-client"
	s.nexarSecret = "nexar-secret"
	s.httpClient = &http.Client{Transport: testTransport(func(r *http.Request) (*http.Response, error) {
		body := `{"access_token":"nexar-token"}`
		if r.URL.Host == "api.nexar.com" {
			body = `{"data":{"supSearchMpn":{"results":[{"part":{"mpn":"STM32F401RET6","shortDescription":"ARM Cortex-M4 MCU","manufacturer":{"name":"STMicroelectronics"},"sellers":[{"company":{"name":"Arrow Electronics"},"offers":[{"sku":"ARW-STM32","inventoryLevel":1200,"moq":1,"prices":[{"quantity":1,"price":5.10,"currency":"USD"},{"quantity":100,"price":4.12,"currency":"USD"}]}]},{"company":{"name":"DigiKey"},"offers":[{"sku":"497-14362-1-ND","inventoryLevel":8420,"moq":1,"prices":[{"quantity":100,"price":4.38,"currency":"USD"}]}]}]}}]}}}`
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}
	part := s.enrichSinglePart(context.Background(), "STM32F401RET6", 100)
	if part.DataSource != "live" || part.BestUnitPriceAtQty != 4.12 || part.BestDistributor != "Arrow Electronics" {
		t.Fatalf("incorrect nexar live quote: %+v", part)
	}
	if part.DistributorCount != 2 || part.Offers[0].Source != "nexar_api_live" {
		t.Fatalf("expected 2 live sellers from nexar, got %+v", part)
	}
}

func TestNexarCachesTokensAndRequiresExplicitUSDCurrency(t *testing.T) {
	s := NewIngestServer()
	s.nexarClientID = "fixture"
	s.nexarSecret = "fixture"
	tokens := 0
	s.httpClient = &http.Client{Transport: testTransport(func(r *http.Request) (*http.Response, error) {
		body := `{"access_token":"fixture-token","expires_in":86400}`
		if r.URL.Host == "identity.nexar.com" {
			tokens++
			_ = r.ParseForm()
			if r.Form.Get("scope") != "supply.domain" {
				t.Error("missing supply scope")
			}
		} else {
			if r.Header.Get("Authorization") != "Bearer fixture-token" {
				t.Error("missing bearer token")
			}
			body = `{"data":{"supSearchMpn":{"results":[{"part":{"mpn":"PART","sellers":[{"company":{"name":"Supplier"},"offers":[{"inventoryLevel":5,"moq":1,"prices":[{"quantity":1,"price":4,"currency":"EUR"},{"quantity":1,"price":5,"currency":""},{"quantity":1,"price":6,"currency":"USD"}]}]}]}}]}}}`
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}
	for i := 0; i < 2; i++ {
		offers, err := s.queryNexarLive(context.Background(), "PART")
		if err != nil || len(offers) != 1 || len(offers[0].PriceBreaks) != 1 || offers[0].PriceBreaks[0].UnitPrice != 6 {
			t.Fatalf("currency contract failed: %v %+v", err, offers)
		}
		if offers[0].LifecycleStatus != "Unknown" || offers[0].LeadTimeWeeks != 0 {
			t.Fatal("invented metadata")
		}
	}
	if tokens != 1 {
		t.Fatalf("expected cached token, fetched %d", tokens)
	}
}
func TestNexarGraphQLErrorsAreFailures(t *testing.T) {
	s := NewIngestServer()
	s.nexarClientID = "fixture"
	s.nexarSecret = "fixture"
	s.httpClient = &http.Client{Transport: testTransport(func(r *http.Request) (*http.Response, error) {
		body := `{"access_token":"fixture-token"}`
		if r.URL.Host == "api.nexar.com" {
			body = `{"errors":[{"message":"quota"}],"data":null}`
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}
	if _, err := s.queryNexarLive(context.Background(), "PART"); err == nil {
		t.Fatal("GraphQL errors must not be interpreted as a successful empty search")
	}
}
