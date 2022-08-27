package config

import (
	"net/netip"
	"os"
	"strings"
)

type Config struct {
	BindTarget              string
	ProxyDisallowedHosts    map[string]any // A set of hostnames/IPAddresses.
	ProxyDisallowedPrefixes []netip.Prefix
}

func MustLoad() Config {
	target := loadBindProtocolAndTarget()
	hosts, prefixes := loadProxyDisallowedHosts()
	return Config{
		BindTarget:              target,
		ProxyDisallowedHosts:    hosts,
		ProxyDisallowedPrefixes: prefixes,
	}
}

func loadBindProtocolAndTarget() string {
	if port, ok := os.LookupEnv("PORT"); ok {
		return ":" + port
	} else {
		return ":3061"
	}
}

func loadProxyDisallowedHosts() (map[string]any, []netip.Prefix) {
	disallowedConfig := os.Getenv("PRESTIGE_PROXY_DISALLOWED_HOSTS")
	if disallowedConfig == "" {
		// Private Network IP ranges <https://en.wikipedia.org/wiki/Private_network>.
		disallowedConfig = "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fd00::/8"
		// Localhost.
		disallowedConfig += ", localhost, 0.0.0.0/32, 127.0.0.1/32, [::]"
		// EC2 Instance Metadata endpoints.
		disallowedConfig += ", 169.254.169.254/32, [fd00:ec2::254]"
	}

	proxyDisallowedHosts := map[string]any{}

	var proxyDisallowedPrefixes []netip.Prefix

	for _, entry := range strings.Split(disallowedConfig, ",") {
		prefix, err := netip.ParsePrefix(entry)
		if err != nil {
			proxyDisallowedHosts[entry] = nil
		} else {
			proxyDisallowedPrefixes = append(proxyDisallowedPrefixes, prefix)
		}
	}

	return proxyDisallowedHosts, proxyDisallowedPrefixes
}
