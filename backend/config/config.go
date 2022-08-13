package config

import (
	"net/netip"
	"os"
	"strings"
)

type Config struct {
	BindProtocol            string
	BindTarget              string
	ProxyDisallowedHosts    map[string]any // A set of hostnames/IPAddresses.
	ProxyDisallowedPrefixes []netip.Prefix
}

func MustLoad() Config {
	protocol, target := loadBindProtocolAndTarget()
	hosts, prefixes := loadProxyDisallowedHosts()
	return Config{
		BindProtocol:            protocol,
		BindTarget:              target,
		ProxyDisallowedHosts:    hosts,
		ProxyDisallowedPrefixes: prefixes,
	}
}

func loadBindProtocolAndTarget() (protocol string, target string) {
	bindTarget := os.Getenv("LT_BIND")
	if bindTarget == "" {
		if port, ok := os.LookupEnv("PORT"); ok {
			bindTarget = ":" + port
		} else {
			bindTarget = ":3061"
		}
	}

	if strings.HasPrefix(bindTarget, "unix/") {
		return "unix", strings.TrimPrefix(bindTarget, "unix/")
	} else {
		return "tcp", bindTarget
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
